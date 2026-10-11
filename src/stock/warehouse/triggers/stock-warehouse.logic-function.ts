import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { cascadeOrderpointsWithParent } from 'src/stock/orderpoint/orderpoint-cascade';
import { stockWarehouses } from 'src/stock/stock-records';
import { STOCK_WAREHOUSE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { handleWarehouseActive } from 'src/stock/warehouse/rules/warehouse-active';
import { handleWarehouseCreated } from 'src/stock/warehouse/rules/warehouse-created';
import { handleWarehouseDeletes } from 'src/stock/warehouse/rules/warehouse-delete';
import { handleWarehouseFlowsChanged } from 'src/stock/warehouse/rules/warehouse-flows-changed';
import { handleWarehousePartner } from 'src/stock/warehouse/rules/warehouse-partner';
import { handleWarehouseRenamed } from 'src/stock/warehouse/rules/warehouse-renamed';
import { type WarehouseEventRecord } from 'src/stock/warehouse/types/warehouse-event-record.type';

const cascadeOrderpoints = cascadeOrderpointsWithParent(stockWarehouses, 'warehouseId');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<WarehouseEventRecord>>) => {
  const { operation, events } = readEvents<WarehouseEventRecord>(payload);
  const errors = errorCollector();

  await handleWarehouseCreated(events, operation, errors);
  await handleWarehouseActive(events, operation, errors);
  await handleWarehouseFlowsChanged(events, operation, errors);
  await handleWarehouseRenamed(events, operation, errors);
  await handleWarehousePartner(events, operation, errors);
  await handleWarehouseDeletes(events, operation, errors);
  await cascadeOrderpoints(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_WAREHOUSE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-warehouse',
  description:
    'Builds and rebuilds a warehouse\'s locations, sequences and operation types, archives them with the warehouse, gives its address the transit location, renames the full names of its operation types with it, deletes its operation types, and deletes or restores its reordering rules, with it, and puts back archiving with open operations and deleting a warehouse in use.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockWarehouse.*', batchMode: true },
});
