import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { fsmOrders, fsmPersons, resTerritories } from 'src/fieldservice/fieldservice-records';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';
import { stockWarehouses } from 'src/stock/stock-records';

const WAREHOUSE_DELETE_RULES = {
  references: [
    { of: fsmPersons, field: 'defaultWarehouseId' },
    { of: resTerritories, field: 'warehouseId' },
  ],
  cascades: [],
  links: [],
};

// A deleted warehouse leaves the workers and territories that name it. One that orders use is kept (the warehouse
// rules put it back), so it keeps them too.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    const ids = events.map((event) => event.recordId);
    const using = await fsmOrders.find<{ warehouseId: string }>({ warehouseId: { in: ids } }, 'warehouseId');
    const used = new Set(using.map((order) => order.warehouseId));

    await applyDeleteRules(
      stockWarehouses,
      WAREHOUSE_DELETE_RULES,
      ids.filter((id) => !used.has(id)),
    );
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockWarehouse,
  name: 'platform-stock-warehouse-fsm',
  description: 'Clears a deleted warehouse from the default warehouse of workers and from territories.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockWarehouse.deleted', batchMode: true },
});
