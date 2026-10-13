import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { nextNumber } from 'src/base/sequence/next-number';
import { settleLotDates } from 'src/product-expiry/settle-lot-dates';
import { isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { addNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { stockLots } from 'src/stock/lot/lot-records';
import { relocateLotEdits } from 'src/stock/lot/relocate-lot-edits';
import { type LotEventRecord } from 'src/stock/lot/types/lot-event-record.type';
import { findSome } from 'src/stock/stock-exists';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { putBackForEvent, restoreForEvent } from 'src/stock/stock-put-back';
import { productProducts, stockQuants } from 'src/stock/stock-records';
import { STOCK_LOT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { lotProductChangeRefusal, planLotName } from 'src/stock/utils/plan-lot-rules.util';

type LotEvent = ObjectRecordEvent<LotEventRecord>;

const OBJECT = { objectSingular: 'stockLot', objectPlural: 'stockLots' } as const;

// Every new lot is named here, the ones the app makes at Validate too. The
// rows are read again so a rerun never numbers a lot twice.
const nameNewLots = async (events: LotEvent[]) => {
  const stored = await stockLots.find<{ id: string; name: string | null; productId: string | null }>(
    { id: { in: events.map((event) => event.recordId) } },
    'id name productId',
  );
  const unnamed = stored.filter((lot) => !lot.name);

  if (unnamed.length === 0) {
    return;
  }
  const products = await productProducts.find<{ id: string; productTmpl: { lotSequenceId: string | null } | null }>(
    { id: { in: [...new Set(unnamed.flatMap((lot) => lot.productId ?? []))] } },
    'id productTmpl { lotSequenceId }',
  );
  const sequenceByProduct = new Map(products.map((product) => [product.id, product.productTmpl?.lotSequenceId ?? null]));
  const eventById = new Map(events.map((event) => [event.recordId, event]));
  const errors = errorCollector();

  for (const lot of unnamed) {
    await errors.run(lot.id, async () => {
      const plan = planLotName({
        name: lot.name,
        lotSequenceId: lot.productId === null ? null : (sequenceByProduct.get(lot.productId) ?? null),
      });

      if (plan.kind === 'number') {
        await stockLots.update(lot.id, { name: await nextNumber(plan.sequenceId) });
      } else if (plan.kind === 'refuse') {
        // The note comes first: a lot is never removed without one. A lot
        // with no product has nothing to hold a note and is removed alone.
        if (lot.productId !== null) {
          const event = eventById.get(lot.id) ?? {};

          await addNote({
            objectSingular: 'productProduct',
            recordId: lot.productId,
            title: await localizedReason(event, 'Lot removed'),
            body: await localizedReason(event, plan.reason),
          });
        }
        await stockLots.destroyMany([lot.id]);
      }
    });
  }
  errors.throwIfAny();
};

const putBackProductChanges = async (events: LotEvent[]) => {
  const changed = events.filter((event) => {
    const before = eventBefore(event);
    const after = eventAfter(event);

    return (
      before !== undefined &&
      after !== undefined &&
      before.productId !== after.productId &&
      isStaffChange('updated', event, after)
    );
  });

  if (changed.length === 0) {
    return;
  }
  const stored = await stockLots.find<{ id: string; productId: string | null }>(
    { id: { in: changed.map((event) => event.recordId) } },
    'id productId',
  );
  const productByLot = new Map(stored.map((lot) => [lot.id, lot.productId]));
  const errors = errorCollector();

  for (const event of changed) {
    const beforeProductId = eventBefore(event)?.productId ?? null;

    if (!productByLot.has(event.recordId)) {
      continue;
    }
    const afterProductId = productByLot.get(event.recordId) ?? null;

    await errors.run(event.recordId, async () => {
      const otherLines = await findSome<{ productId: string | null }>(
        'stockMoveLine',
        'stockMoveLines',
        afterProductId === null
          ? { lotId: { eq: event.recordId } }
          : { lotId: { eq: event.recordId }, productId: { neq: afterProductId } },
        'productId',
        1,
      );
      const reason = lotProductChangeRefusal({
        beforeProductId,
        afterProductId,
        moveLineProductIds: otherLines.flatMap((line) => line.productId ?? []),
      });

      if (reason !== null) {
        await putBackForEvent({ ...OBJECT, event, data: { productId: beforeProductId }, message: reason });
      }
    });
  }
  errors.throwIfAny();
};

// A quant row holds its lot with a restricting reference.
const restoreLotsInStock = async (events: LotEvent[]) => {
  const deletedIds = await stillDeletedIds(
    stockLots,
    events.map((event) => event.recordId),
  );
  const quants = await stockQuants.find<{ lotId: string | null }>({ lotId: { in: deletedIds } }, 'lotId');
  const held = new Set(quants.flatMap((quant) => quant.lotId ?? []));
  const errors = errorCollector();

  for (const event of events.filter((candidate) => held.has(candidate.recordId))) {
    await errors.run(event.recordId, () => restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE }));
  }
  errors.throwIfAny();
};

const handler = async (payload: DatabaseEventBatchPayload<LotEvent>) => {
  const { operation, events } = readEvents<LotEventRecord>(payload);

  if (operation === 'created') {
    await nameNewLots(events);
    await settleLotDates(operation, events);
  } else if (operation === 'updated') {
    await putBackProductChanges(events);
    await relocateLotEdits(events);
    await settleLotDates(operation, events);
  } else if (operation === 'deleted') {
    await restoreLotsInStock(events);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_LOT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-lot',
  description:
    'Names new lots from their product sequence, dates them from their product and keeps their dates on their stock, refuses a product change while moves of another product use the lot, moves a lot whose location a user set, and puts back a deleted lot that stock still holds.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockLot.*', batchMode: true },
});
