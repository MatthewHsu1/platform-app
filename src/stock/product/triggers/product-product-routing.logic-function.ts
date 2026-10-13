import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { carryVariantActiveToOrderpoints, cascadeOrderpointsWithParent } from 'src/stock/orderpoint/orderpoint-cascade';
import { syncPutawayRules } from 'src/stock/putaway/sync-putaway-rules';
import { productProducts, stockPutawayRules, stockStorageCategoryCapacities } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { restoredParents } from 'src/stock/stock-event-helpers';
import { syncCapacityNames } from 'src/stock/storage-category/sync-capacity-names';

type VariantRecord = { id: string; active?: boolean | null; deletedAt?: string | null };

const CHILDREN = [
  { of: stockPutawayRules, field: 'productId' },
  { of: stockStorageCategoryCapacities, field: 'productId' },
];
const cascadeOrderpoints = cascadeOrderpointsWithParent(productProducts, 'productId');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<VariantRecord>>) => {
  const { operation, events } = readEvents<VariantRecord>(payload);
  const ids = events.map((event) => event.recordId);
  const errors = errorCollector();

  if (operation === 'updated') {
    const renamed = events.filter((event) => updatedFieldsOf(event).includes('name')).map((event) => event.recordId);

    if (renamed.length > 0) {
      await errors.run('capacity names', () => syncCapacityNames({ productId: { in: renamed } }));
      await errors.run('putaway rule names', () => syncPutawayRules({ productId: { in: renamed } }));
    }
  }
  if (operation === 'deleted') {
    await errors.run('putaway rules and capacities', () =>
      cascadeDelete({ parents: productProducts, parentIds: ids, children: CHILDREN }),
    );
  }
  if (operation === 'restored') {
    await errors.run('putaway rules and capacities', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: CHILDREN,
      }),
    );
  }
  await carryVariantActiveToOrderpoints(events, operation, errors);
  await cascadeOrderpoints(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productProduct,
  name: 'platform-product-product-routing',
  description:
    "Keeps the names of a variant's putaway rules and storage capacities, deletes or restores them and its reordering rules with the variant, and archives or unarchives its reordering rules with it.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productProduct.*', batchMode: true },
});
