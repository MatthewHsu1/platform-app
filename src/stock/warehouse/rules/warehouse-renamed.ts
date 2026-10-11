import { recomputePickingTypeNames } from 'src/stock/picking-type/recompute-picking-type-names';
import { eventValues } from 'src/stock/warehouse/rules/warehouse-event.type';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

// Operation types carry the warehouse name in their full name.
export const handleWarehouseRenamed: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'updated') {
    return;
  }
  const ids = events
    .filter((event) => {
      const { before, after } = eventValues(event);

      return before !== undefined && after !== undefined && (before.name ?? '') !== (after.name ?? '');
    })
    .map((event) => event.recordId);

  if (ids.length > 0) {
    await errors.run('operation type full names', () => recomputePickingTypeNames({ warehouseId: { in: ids } }));
  }
};
