import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { addNote } from 'src/shared/triggers/put-back';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { sameValue } from 'src/shared/utils/same-value.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { type MoveLineTrackingRefusalStore } from 'src/stock/lot/types/move-line-tracking-refusal-store.type';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { moveLineTrackingRefusal } from 'src/stock/utils/move-line-tracking-refusal.util';
import { planMoveLineTrackingUndo } from 'src/stock/utils/plan-move-line-tracking-undo.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';

type MoveLineEvent = ObjectRecordEvent<MoveLineEventRecord>;

const OBJECT = { objectSingular: 'stockMoveLine', objectPlural: 'stockMoveLines' } as const;
const WATCHED: (keyof MoveLineEventRecord & string)[] = ['lotId', 'productId', 'quantity', 'productUomId'];

// A line staff save with a lot of another product, or with a serial quantity other than 0 or 1, is refused and
// the whole save undone. The refused events are returned so the other move-line rules never act on them; a
// later save of the same line in the batch still reaches them. A save the row no longer shows (it changed again
// since) is left to those rules.
export const makeHandleMoveLineTrackingRefusals =
  (store: MoveLineTrackingRefusalStore) =>
  async (events: MoveLineEvent[], operation: RecordOperation, errors: ErrorCollector): Promise<Set<MoveLineEvent>> => {
    const refused = new Set<MoveLineEvent>();

    if (operation !== 'created' && operation !== 'updated') {
      return refused;
    }
    const staffEvents = events.filter((event) => {
      const after = eventAfter(event);

      return (
        after !== undefined &&
        !isApplicationWrite(after) &&
        (operation === 'created' || eventChangedFields(event, WATCHED).length > 0)
      );
    });

    if (staffEvents.length === 0) {
      return refused;
    }
    const stored = await store.readLines(distinctIds(staffEvents.map((event) => event.recordId)));
    const [lots, products, uoms] = await Promise.all([
      store.readLots(distinctIds(stored.map((line) => line.lotId))),
      store.readProducts(distinctIds(stored.map((line) => line.productId))),
      store.uoms(),
    ]);
    const lineById = new Map(stored.map((line) => [line.id, line]));
    const lotById = new Map(lots.map((lot) => [lot.id, lot]));
    const digits = store.digits();

    for (const event of staffEvents) {
      const line = lineById.get(event.recordId);
      const after = eventAfter(event);
      const product = line === undefined ? undefined : products.get(line.productId);

      if (
        line === undefined ||
        after === undefined ||
        product === undefined ||
        line.state === MOVE_STATE.CANCEL ||
        WATCHED.some((field) => !sameValue(line[field as keyof typeof line], after[field]))
      ) {
        continue;
      }
      const lot = line.lotId === null ? undefined : lotById.get(line.lotId);
      const refusal = moveLineTrackingRefusal({
        tracking: product.tracking,
        quantityProductUom: convertQuantity({
          qty: line.quantity,
          fromUomId: line.productUomId ?? product.uomId,
          toUomId: product.uomId,
          uoms,
          digits,
          method: 'HALF-UP',
        }),
        productId: line.productId,
        productName: product.displayName,
        lotProductId: lot?.productId ?? null,
        lotName: lot?.name ?? null,
        unitName: uoms.get(product.uomId)?.name ?? '',
        digits,
      });

      if (refusal === null) {
        continue;
      }
      const undo = planMoveLineTrackingUndo({
        operation,
        before: eventBefore(event),
        after: { ...after, pickingId: line.pickingId, moveId: line.moveId },
        updatedFields: updatedFieldsOf(event),
      });

      if (undo.kind === 'none') {
        continue;
      }
      refused.add(event);
      await errors.run(event.recordId, () =>
        undo.kind === 'putBack' ? store.putBack(event, undo.data, refusal) : store.destroyWithNote(event, undo.noteOn, refusal),
      );
    }

    return refused;
  };

export const handleMoveLineTrackingRefusals = makeHandleMoveLineTrackingRefusals({
  readLines: (lineIds) => stockMoveLines.find({ id: { in: lineIds } }, MOVE_LINE_ROW),
  readLots: (lotIds) => stockLots.find({ id: { in: lotIds } }, 'id name productId'),
  readProducts: readStockProducts,
  uoms: readResolvedUoms,
  digits: () => readStockSettings().productUnitDigits,
  putBack: (event, data, refusal) =>
    putBackForEvent({ ...OBJECT, event, data, message: refusal.message, values: refusal.values }),
  destroyWithNote: async (event, noteOn, refusal) => {
    const locale = await readMemberLocale(event.workspaceMemberId);

    await stockMoveLines.destroyMany([event.recordId]);
    if (noteOn !== null) {
      await addNote({
        ...noteOn,
        title: translate(locale, 'Line removed'),
        body: translate(locale, refusal.message, refusal.values),
      });
    }
  },
});
