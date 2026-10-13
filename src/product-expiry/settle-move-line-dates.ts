import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { writeGrouped } from 'src/shared/triggers/write-grouped';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { readExpiryTimes } from 'src/product-expiry/read-expiry-times';
import { sameDate } from 'src/product-expiry/utils/lot-dates.util';
import { planMoveLineExpiryDates } from 'src/product-expiry/utils/move-line-expiry-dates.util';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { type DatedMoveLine } from 'src/product-expiry/types/dated-move-line.type';
import { type MoveLineDateRequest } from 'src/product-expiry/types/move-line-date-request.type';
import { type SettleMoveLineDatesStore } from 'src/product-expiry/types/settle-move-line-dates-store.type';
import { type MoveLineDateChange } from 'src/product-expiry/utils/types/move-line-date-change.type';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

type StoredLine = {
  id: string;
  state: DatedMoveLine['state'];
  lotId: string | null;
  productId: string;
  pickingId: string | null;
  expirationDate: string | null;
  removalDate: string | null;
  lot: { expirationDate: string | null; removalDate: string | null } | null;
  picking: { scheduledDate: string | null; pickingType: { useCreateLots: boolean | null } | null } | null;
};

const NO_CHANGE: MoveLineDateChange = { created: false, lot: false, product: false, scheduledDate: false };
const NO_EXPIRY = { useExpirationDate: false, expirationTime: 0, removalTime: 0 };
// Twenty drops a relation nested under a to-one relation unless that relation
// also selects deletedAt.
const STORED_LINE_SELECTION = `id state lotId productId pickingId expirationDate removalDate
  lot { expirationDate removalDate } picking { deletedAt scheduledDate pickingType { useCreateLots } }`;

const toDatedLine = (line: StoredLine): DatedMoveLine => ({
  id: line.id,
  state: line.state,
  lotId: line.lotId,
  productId: line.productId,
  pickingId: line.pickingId,
  expirationDate: line.expirationDate,
  removalDate: line.removalDate,
  lot: line.lotId === null ? null : line.lot,
  usesCreateLots: line.picking?.pickingType?.useCreateLots === true,
  scheduledDate: line.picking?.scheduledDate ?? null,
});

// Several saves of one line in a batch are worked out once, from the line before the first of them.
const mergeRequests = (requests: MoveLineDateRequest[]) => {
  const byLine = new Map<string, MoveLineDateRequest>();

  for (const request of requests) {
    const seen = byLine.get(request.lineId);

    byLine.set(
      request.lineId,
      seen === undefined
        ? request
        : {
            lineId: request.lineId,
            changed: {
              created: seen.changed.created || request.changed.created,
              lot: seen.changed.lot || request.changed.lot,
              product: seen.changed.product || request.changed.product,
              scheduledDate: seen.changed.scheduledDate || request.changed.scheduledDate,
            },
            before: seen.before ?? request.before,
          },
    );
  }
  return byLine;
};

const stillChanged = ({ changed, before }: MoveLineDateRequest, line: DatedMoveLine): MoveLineDateChange =>
  before === undefined
    ? changed
    : {
        created: changed.created,
        lot: changed.lot && before.lotId !== line.lotId,
        product: changed.product && before.productId !== line.productId,
        scheduledDate: changed.scheduledDate && before.pickingId !== line.pickingId,
      };

// A line's dates follow its lot, product and transfer, the app's own lines too: reservation and Validate make lines
// that need dates. Only the date fields are written, and they change none of those, so a second pass writes nothing.
// When a lot's own dates change, its lines are worked out again here too, as lines whose lot changed.
export const makeSettleMoveLineDates = (store: SettleMoveLineDatesStore) => {
  // A cancelled line keeps the dates it had.
  const settleLines = async (lines: DatedMoveLine[], changedOf: (line: DatedMoveLine) => MoveLineDateChange) => {
    const live = lines.filter((line) => line.state !== MOVE_STATE.CANCEL);

    if (live.length === 0) {
      return;
    }
    const times = await store.readExpiryTimes(distinctIds(live.map((line) => line.productId)));
    const today = store.now();
    const updates = live.flatMap((line) => {
      const data = planMoveLineExpiryDates({
        changed: changedOf(line),
        lot: line.lot,
        usesCreateLots: line.usesCreateLots,
        product: times.get(line.productId) ?? NO_EXPIRY,
        current: { expirationDate: line.expirationDate, removalDate: line.removalDate },
        scheduledDate: line.scheduledDate,
        today,
      });

      return Object.keys(data).length === 0 ? [] : [{ id: line.id, data }];
    });

    await store.writeLines(updates);
  };

  const settleMoveLineDates = async (requests: MoveLineDateRequest[]) => {
    if (requests.length === 0) {
      return;
    }
    const byLine = mergeRequests(requests);
    const lines = await store.readLines([...byLine.keys()]);

    await settleLines(lines, (line) => {
      const request = byLine.get(line.id);

      return request === undefined ? NO_CHANGE : stillChanged(request, line);
    });
  };

  // A new line, or a line whose lot, product or transfer changed.
  const settleLineEventDates = (operation: RecordOperation, events: ObjectRecordEvent<MoveLineEventRecord>[]) =>
    settleMoveLineDates(
      events.flatMap((event): MoveLineDateRequest[] => {
        const before = eventBefore(event);
        const after = eventAfter(event);

        if (after === undefined) {
          return [];
        }
        if (operation === 'created') {
          return [{ lineId: event.recordId, changed: { ...NO_CHANGE, created: true } }];
        }
        if (operation !== 'updated' || before === undefined) {
          return [];
        }
        const changed: MoveLineDateChange = {
          ...NO_CHANGE,
          lot: (before.lotId ?? null) !== (after.lotId ?? null),
          product: before.productId !== after.productId,
          scheduledDate: (before.pickingId ?? null) !== (after.pickingId ?? null),
        };

        return changed.lot || changed.product || changed.scheduledDate
          ? [
              {
                lineId: event.recordId,
                changed,
                before: { lotId: before.lotId ?? null, productId: before.productId, pickingId: before.pickingId ?? null },
              },
            ]
          : [];
      }),
    );

  // A transfer whose scheduled date moved, whoever moved it: the app writes it when its moves' dates change.
  const settleTransferEventDates = async (operation: RecordOperation, events: ObjectRecordEvent<PickingEventRecord>[]) => {
    if (operation !== 'updated') {
      return;
    }
    const rescheduled = events.flatMap((event) => {
      const before = eventBefore(event);
      const after = eventAfter(event);

      return before !== undefined && after !== undefined && !sameDate(before.scheduledDate ?? null, after.scheduledDate ?? null)
        ? [event.recordId]
        : [];
    });

    if (rescheduled.length === 0) {
      return;
    }
    await settleLines(await store.readTransferLines(distinctIds(rescheduled)), () => ({ ...NO_CHANGE, scheduledDate: true }));
  };

  // The lines of lots whose dates changed.
  const settleLotLineDates = async (lotIds: string[]) => {
    if (lotIds.length === 0) {
      return;
    }
    await settleLines(await store.readLotLines(distinctIds(lotIds)), () => ({ ...NO_CHANGE, lot: true }));
  };

  return { settleMoveLineDates, settleLineEventDates, settleTransferEventDates, settleLotLineDates };
};

export const { settleMoveLineDates, settleLineEventDates, settleTransferEventDates, settleLotLineDates } = makeSettleMoveLineDates({
  readLines: async (lineIds) =>
    (await stockMoveLines.find<StoredLine>({ id: { in: lineIds } }, STORED_LINE_SELECTION)).map(toDatedLine),
  readTransferLines: async (pickingIds) =>
    (
      await stockMoveLines.find<StoredLine>(
        { pickingId: { in: pickingIds }, state: { neq: MOVE_STATE.CANCEL } },
        STORED_LINE_SELECTION,
      )
    ).map(toDatedLine),
  readLotLines: async (lotIds) =>
    (
      await stockMoveLines.find<StoredLine>({ lotId: { in: lotIds }, state: { neq: MOVE_STATE.CANCEL } }, STORED_LINE_SELECTION)
    ).map(toDatedLine),
  readExpiryTimes,
  writeLines: (updates) => writeGrouped(stockMoveLines, updates),
  now: () => new Date(),
});
