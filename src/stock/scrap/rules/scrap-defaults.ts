import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { readScrapDefaults } from 'src/stock/scrap/read-scrap-defaults';
import { type ScrapEventRecord } from 'src/stock/scrap/types/scrap-event-record.type';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockPickings, stockScraps } from 'src/stock/stock-records';
import { PICKING_ROW, SCRAP_ROW } from 'src/stock/stock-rows';
import { planScrapDefaults } from 'src/stock/utils/plan-scrap-defaults.util';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type ScrapRow } from 'src/stock/types/scrap-row.type';

const OBJECT = { objectSingular: 'stockScrap', objectPlural: 'stockScraps' } as const;

// A refused new scrap is destroyed and the note goes on its transfer when it has one. A refused edit (the
// transfer was cleared and there is no warehouse) puts the transfer back.
export const handleScrapDefaults = async (
  events: ObjectRecordEvent<ScrapEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  const relevant = events.filter((event) => {
    const after = eventAfter(event);
    const before = eventBefore(event);

    if (after === undefined || isApplicationWrite(after)) {
      return false;
    }

    return operation === 'created' || before?.productId !== after.productId || before?.pickingId !== after.pickingId;
  });

  if (relevant.length === 0) {
    return;
  }
  const scraps = await stockScraps.find<ScrapRow>({ id: { in: relevant.map((event) => event.recordId) } }, SCRAP_ROW);
  const pickingIds = scraps.flatMap((scrap) => (scrap.pickingId === null ? [] : [scrap.pickingId]));
  const pickings =
    pickingIds.length === 0 ? [] : await stockPickings.find<PickingRow>({ id: { in: pickingIds } }, PICKING_ROW);
  const products = await readStockProducts(scraps.flatMap((scrap) => (scrap.productId === null ? [] : [scrap.productId])));
  const defaults = await readScrapDefaults();

  for (const event of relevant) {
    const scrap = scraps.find((candidate) => candidate.id === event.recordId);
    const before = eventBefore(event);

    if (scrap === undefined) {
      continue;
    }
    await errors.run(scrap.id, async () => {
      const plan = planScrapDefaults({
        operation,
        productChanged: before !== undefined && before.productId !== scrap.productId,
        pickingChanged: before !== undefined && before.pickingId !== scrap.pickingId,
        scrap,
        productUomId: scrap.productId === null ? null : (products.get(scrap.productId)?.uomId ?? null),
        picking: pickings.find((candidate) => candidate.id === scrap.pickingId) ?? null,
        ...defaults,
      });

      if (plan.kind === 'write') {
        await stockScraps.update(scrap.id, plan.data);
        return;
      }
      if (operation === 'created') {
        await stockScraps.destroyMany([scrap.id]);
        const reason = await localizedReason(event, plan.reason);

        if (scrap.pickingId !== null) {
          await addNote({ objectSingular: 'stockPicking', recordId: scrap.pickingId, title: 'Scrap not kept', body: reason });
          return;
        }
        // Nothing to hold a note: the reason is the trigger's error so the refusal is never silent.
        throw new Error(reason);
      }
      await putBackForEvent({ ...OBJECT, event, data: { pickingId: before?.pickingId ?? null }, message: plan.reason });
    });
  }
};
