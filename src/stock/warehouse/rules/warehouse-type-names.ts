import { recomputePickingTypeNames } from 'src/stock/picking-type/recompute-picking-type-names';
import { eventValues } from 'src/stock/warehouse/rules/warehouse-event.type';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

// Operation types carry the warehouse name in their full name, and only their own name while the
// warehouse is in the trash. Runs after the delete rule, so types trashed with the warehouse are skipped.
export const handleWarehouseTypeNames: WarehouseRule = async (events, operation, errors) => {
  const ids =
    operation === 'deleted' || operation === 'restored'
      ? events.map((event) => event.recordId)
      : operation === 'updated'
        ? events
            .filter((event) => {
              const { before, after } = eventValues(event);

              return before !== undefined && after !== undefined && (before.name ?? '') !== (after.name ?? '');
            })
            .map((event) => event.recordId)
        : [];

  if (ids.length > 0) {
    await errors.run('operation type full names', () => recomputePickingTypeNames({ warehouseId: { in: ids } }));
  }
};
