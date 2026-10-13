import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { stockWhResupplyTables } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';

type LinkRecord = { id: string; suppliedWhId: string | null; supplierWhId: string | null };

// Per supplied warehouse, the suppliers added or removed in this batch.
const groupBySupplied = (links: LinkRecord[]) => {
  const groups = new Map<string, string[]>();

  for (const link of links) {
    if (link.suppliedWhId !== null && link.supplierWhId !== null) {
      groups.set(link.suppliedWhId, [...(groups.get(link.suppliedWhId) ?? []), link.supplierWhId]);
    }
  }
  return groups;
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkRecord>>) => {
  const { operation, events } = readEvents<LinkRecord>(payload);
  const errors = errorCollector();

  // Ticking a supplier that was unticked before brings back the same row.
  if (operation === 'created' || operation === 'restored') {
    for (const [warehouseId, supplierIds] of groupBySupplied(events.flatMap((event) => eventAfter(event) ?? []))) {
      await errors.run(warehouseId, () => reconcileWarehouseClaimed(warehouseId, 'updated', { resupplyAdded: supplierIds }));
    }
  }
  if (operation === 'deleted') {
    for (const [warehouseId, supplierIds] of groupBySupplied(events.flatMap((event) => eventBefore(event) ?? []))) {
      await errors.run(warehouseId, () => reconcileWarehouseClaimed(warehouseId, 'updated', { resupplyRemoved: supplierIds }));
    }
    await errors.run('links', () => stockWhResupplyTables.destroySoftDeleted(events.map((event) => event.recordId)));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockWhResupplyTable,
  name: 'platform-stock-wh-resupply-table',
  description:
    'Makes, archives or brings back the resupply route when a warehouse gets or loses a supplying warehouse, and removes the link for good once it is deleted.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockWhResupplyTable.*', batchMode: true },
});
