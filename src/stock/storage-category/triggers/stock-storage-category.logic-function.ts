import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { clearReferences, restoreCascaded, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import {
  stockLocations,
  stockPutawayRules,
  stockStorageCategories,
  stockStorageCategoryCapacities,
} from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { restoredParents } from 'src/stock/stock-event-helpers';

type StorageCategoryRecord = { id: string; deletedAt?: string | null };

const CHILDREN = [
  { of: stockStorageCategoryCapacities, field: 'storageCategoryId' },
  { of: stockPutawayRules, field: 'storageCategoryId' },
];

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<StorageCategoryRecord>>) => {
  const { operation, events } = readEvents<StorageCategoryRecord>(payload);
  const ids = events.map((event) => event.recordId);
  const errors = errorCollector();

  if (operation === 'deleted') {
    await errors.run('capacities and putaway rules', () =>
      cascadeDelete({ parents: stockStorageCategories, parentIds: ids, children: CHILDREN }),
    );
    await errors.run('locations', async () =>
      clearReferences(stockLocations, 'storageCategoryId', await stillDeletedIds(stockStorageCategories, ids)),
    );
  }
  if (operation === 'restored') {
    await errors.run('capacities and putaway rules', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: CHILDREN,
      }),
    );
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockStorageCategory,
  name: 'platform-stock-storage-category',
  description:
    'Deletes and restores the capacities and putaway rules of a storage category with it, and clears it from locations once deleted.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockStorageCategory.*', batchMode: true },
});
