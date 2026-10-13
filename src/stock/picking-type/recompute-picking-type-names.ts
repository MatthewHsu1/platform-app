import { stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { planPickingTypeFullNames } from 'src/stock/utils/picking-type-full-name.util';
import { type PickingTypeNameRow } from 'src/stock/types/picking-type-name-row.type';

// The one writer of an operation type's full name, for the types the filter picks.
export const recomputePickingTypeNames = async (filter: Record<string, unknown>) => {
  const [types, warehouses] = await Promise.all([
    stockPickingTypes.find<PickingTypeNameRow>(filter, 'id name warehouseId completeName'),
    stockWarehouses.find<{ id: string; name: string | null }>({}, 'id name'),
  ]);

  for (const { id, data } of planPickingTypeFullNames(types, warehouses)) {
    await stockPickingTypes.update(id, data);
  }
};
