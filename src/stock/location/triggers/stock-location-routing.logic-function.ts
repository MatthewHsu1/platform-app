import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { clearReferences, restoreCascaded, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { cascadeOrderpointsWithParent } from 'src/stock/orderpoint/orderpoint-cascade';
import { recomputeOrderpointsForLocationChanges } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { syncPutawayRules } from 'src/stock/putaway/sync-putaway-rules';
import { stockLocations, stockPickingTypes, stockPutawayRules, stockRules } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { writeRuleMessages } from 'src/stock/rule/write-rule-messages';
import { restoredParents } from 'src/stock/stock-event-helpers';
import { destroyWaveLinksOfLocations } from 'src/stock-picking-batch/wave-links';

type LocationRecord = { id: string; deletedAt?: string | null };

const PUTAWAY_RULES = [
  { of: stockPutawayRules, field: 'locationInId' },
  { of: stockPutawayRules, field: 'locationOutId' },
];
const cascadeOrderpoints = cascadeOrderpointsWithParent(stockLocations, 'locationId');

const renameFollowers = async (renamed: string[]) => {
  const types = await stockPickingTypes.find<{ id: string }>({ defaultLocationDestId: { in: renamed } }, 'id');

  await writeRuleMessages({
    or: [
      { locationSrcId: { in: renamed } },
      { locationDestId: { in: renamed } },
      { pickingTypeId: { in: types.map((type) => type.id) } },
    ],
  });
};

// The location delete check may put a location back after this trigger
// trashed its putaway rules; the restore below brings them back too.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LocationRecord>>) => {
  const { operation, events } = readEvents<LocationRecord>(payload);
  const ids = events.map((event) => event.recordId);
  const errors = errorCollector();

  if (operation === 'updated') {
    const renamed = events.filter((event) => updatedFieldsOf(event).includes('completeName')).map((event) => event.recordId);

    if (renamed.length > 0) {
      await errors.run('rule explanations', () => renameFollowers(renamed));
      await errors.run('putaway rule names', () =>
        syncPutawayRules({ or: [{ locationInId: { in: renamed } }, { locationOutId: { in: renamed } }] }),
      );
    }
  }
  if (operation === 'deleted') {
    await errors.run('putaway rules', () => cascadeDelete({ parents: stockLocations, parentIds: ids, children: PUTAWAY_RULES }));
    await errors.run('rule sources', async () =>
      clearReferences(stockRules, 'locationSrcId', await stillDeletedIds(stockLocations, ids)),
    );
    await errors.run('wave links', async () => destroyWaveLinksOfLocations(await stillDeletedIds(stockLocations, ids)));
  }
  if (operation === 'restored') {
    await errors.run('putaway rules', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: PUTAWAY_RULES,
      }),
    );
  }
  await cascadeOrderpoints(events, operation, errors);
  await recomputeOrderpointsForLocationChanges(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockLocation,
  name: 'platform-stock-location-routing',
  description:
    'Rewrites rule explanations and putaway rule names when a location is renamed, deletes or restores the putaway and reordering rules of a location with it, recomputes the reordering rules when its parent, warehouse or type changes, clears a deleted location from the rules that take from it, and removes its wave links once deleted.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockLocation.*', batchMode: true },
});
