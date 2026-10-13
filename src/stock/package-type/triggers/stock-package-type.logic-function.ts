import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { destroyLinksOf, restoreCascaded, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { settlePackageTypeSequences } from 'src/stock/package-type/settle-package-type-sequences';
import {
  stockPackageTypes,
  stockPackageTypeStockPutawayRuleRels,
  stockPackageTypeStockRouteRels,
  stockStorageCategoryCapacities,
} from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { restoredParents } from 'src/stock/stock-event-helpers';
import { syncCapacityNames } from 'src/stock/storage-category/sync-capacity-names';

type PackageTypeRecord = { id: string; deletedAt?: string | null; sequenceCode?: string | null; updatedAt?: string };

const CAPACITIES = [{ of: stockStorageCategoryCapacities, field: 'packageTypeId' }];

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<PackageTypeRecord>>) => {
  const { operation, events } = readEvents<PackageTypeRecord>(payload);
  const ids = events.map((event) => event.recordId);
  const errors = errorCollector();

  await errors.run('sequences', () => settlePackageTypeSequences(operation, events));
  if (operation === 'updated') {
    const renamed = events.filter((event) => updatedFieldsOf(event).includes('name')).map((event) => event.recordId);

    if (renamed.length > 0) {
      await errors.run('capacity names', () => syncCapacityNames({ packageTypeId: { in: renamed } }));
    }
  }
  if (operation === 'deleted') {
    await errors.run('capacities', () => cascadeDelete({ parents: stockPackageTypes, parentIds: ids, children: CAPACITIES }));
    const removed = await stillDeletedIds(stockPackageTypes, ids);

    await errors.run('route links', () => destroyLinksOf(stockPackageTypeStockRouteRels, 'stockPackageTypeId', removed));
    await errors.run('putaway links', () => destroyLinksOf(stockPackageTypeStockPutawayRuleRels, 'stockPackageTypeId', removed));
  }
  if (operation === 'restored') {
    await errors.run('capacities', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: CAPACITIES,
      }),
    );
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPackageType,
  name: 'platform-stock-package-type',
  description:
    'Makes or renames the package numbering sequence of a package type from its sequence prefix, renames the storage capacities of a renamed package type, deletes and restores its capacities with it, and removes its route and putaway links once deleted.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPackageType.*', batchMode: true },
});
