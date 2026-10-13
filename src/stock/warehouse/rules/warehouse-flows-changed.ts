import { isApplicationWrite } from 'src/shared/triggers/actor';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';
import { eventValues } from 'src/stock/warehouse/rules/warehouse-event.type';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

const FLOW_FIELDS = ['code', 'name', 'receptionSteps', 'deliverySteps'] as const;

// A new name, code or step setting rebuilds what depends on it.
export const handleWarehouseFlowsChanged: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'updated') {
    return;
  }
  for (const event of events) {
    const { before, after } = eventValues(event);

    if (before === undefined || after === undefined || isApplicationWrite(after)) {
      continue;
    }
    if (!FLOW_FIELDS.some((field) => before[field] !== after[field])) {
      continue;
    }
    await errors.run(event.recordId, () =>
      reconcileWarehouseClaimed(event.recordId, 'updated', {
        before: {
          name: before.name,
          code: before.code,
          receptionSteps: before.receptionSteps,
          deliverySteps: before.deliverySteps,
        },
      }),
    );
  }
};
