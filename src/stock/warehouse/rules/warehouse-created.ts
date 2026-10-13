import { isApplicationWrite } from 'src/shared/triggers/actor';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';
import { eventValues } from 'src/stock/warehouse/rules/warehouse-event.type';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

// A warehouse staff create gets its locations, sequences and operation types.
// The install step reconciles the warehouse it makes itself.
export const handleWarehouseCreated: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'created') {
    return;
  }
  for (const event of events) {
    const { after } = eventValues(event);

    if (after === undefined || isApplicationWrite(after)) {
      continue;
    }
    await errors.run(event.recordId, () => reconcileWarehouseClaimed(event.recordId, 'created'));
  }
};
