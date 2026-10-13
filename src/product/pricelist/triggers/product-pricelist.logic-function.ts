import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productPricelistItems, productPricelists } from 'src/product/pricelist/pricelist-records';
import { PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { restoreWithNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type PricelistEventRecord = { id: string };

// A pricelist that another pricelist's rule is based on cannot be deleted,
// and deleting a pricelist deletes the rules of a deleted pricelist with it.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<PricelistEventRecord>>) => {
  const { operation, events } = readEvents<PricelistEventRecord>(payload);

  if (operation !== 'deleted') {
    return {};
  }
  const deletedIds = new Set(events.map((event) => event.recordId));
  const errors = errorCollector();
  const checked: string[] = [];

  for (const recordId of deletedIds) {
    await errors.run(recordId, async () => {
      const basedOnThis = await productPricelistItems.find<{ pricelistId: string | null }>(
        { base: { eq: 'PRICELIST' }, basePricelistId: { eq: recordId } },
        'pricelistId',
      );

      if (basedOnThis.some((rule) => rule.pricelistId !== null && !deletedIds.has(rule.pricelistId))) {
        await restoreWithNote({
          objectSingular: 'productPricelist',
          objectPlural: 'productPricelists',
          recordId,
          reason: 'Other pricelists are based on this one. Change their rules first.',
        });
      }
      checked.push(recordId);
    });
  }
  // A pricelist whose check failed keeps its rules.
  await errors.run('rules', () =>
    cascadeDelete({
      parents: productPricelists,
      parentIds: checked,
      children: [{ of: productPricelistItems, field: 'pricelistId' }],
    }),
  );
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productPricelist,
  name: 'platform-product-pricelist',
  description:
    'Brings back a deleted pricelist that other pricelists are based on, and deletes the rules of a deleted pricelist.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productPricelist.*', batchMode: true },
});
