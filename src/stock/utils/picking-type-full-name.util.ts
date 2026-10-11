import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { changedFields } from 'src/stock/utils/changed-fields.util';
import { type PickingTypeNameRow } from 'src/stock/types/picking-type-name-row.type';

export const pickingTypeFullName = (name: string | null, warehouseName: string | null | undefined): string =>
  warehouseName === undefined || warehouseName === null ? (name ?? '') : `${warehouseName}: ${name ?? ''}`;

// A type whose warehouse is gone (trashed or deleted) is named by itself.
export const planPickingTypeFullNames = (
  types: PickingTypeNameRow[],
  warehouses: { id: string; name: string | null }[],
) => {
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, textOrNull(warehouse.name) ?? '']));

  return types.flatMap((type) => {
    const warehouseName = type.warehouseId === null ? undefined : warehouseNames.get(type.warehouseId);
    const data = changedFields(type, { completeName: pickingTypeFullName(type.name, warehouseName) });

    return Object.keys(data).length === 0 ? [] : [{ id: type.id, data }];
  });
};
