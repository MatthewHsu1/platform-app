import { type TypeDefaults } from 'src/stock/utils/types/type-defaults.type';

export const WAREHOUSE_ONGOING_OPERATIONS_MESSAGE =
  'You still have ongoing operations for operation types {operations} in warehouse {warehouse}';
export const WAREHOUSE_FOREIGN_TYPES_MESSAGE =
  '{operations} have default source or destination locations within warehouse {warehouse}, therefore you cannot archive it.';

const distinct = (values: string[]) => [...new Set(values)];

// Archive and unarchive alike, as the active flag is written either way.
export const warehouseActiveRefusal = ({
  warehouseName,
  ownTypes,
  openMoveTypeIds,
  locationIdsUnderView,
  otherTypes,
}: {
  warehouseName: string;
  ownTypes: TypeDefaults[];
  openMoveTypeIds: string[];
  locationIdsUnderView: string[];
  otherTypes: TypeDefaults[];
}) => {
  const nameById = new Map(ownTypes.map((type) => [type.id, type.name ?? '']));
  const openNames = distinct(
    openMoveTypeIds.flatMap((id) => (nameById.has(id) ? [nameById.get(id) as string] : [])),
  );

  if (openNames.length > 0) {
    return {
      message: WAREHOUSE_ONGOING_OPERATIONS_MESSAGE,
      values: { operations: openNames.join(', '), warehouse: warehouseName },
    };
  }
  const inside = new Set(locationIdsUnderView);
  const foreignNames = distinct(
    otherTypes
      .filter(
        (type) =>
          type.active &&
          !nameById.has(type.id) &&
          type.defaultLocationSrcId !== null &&
          type.defaultLocationDestId !== null &&
          inside.has(type.defaultLocationSrcId) &&
          inside.has(type.defaultLocationDestId),
      )
      .map((type) => type.name ?? ''),
  );

  return foreignNames.length === 0
    ? null
    : {
        message: WAREHOUSE_FOREIGN_TYPES_MESSAGE,
        values: { operations: foreignNames.join(', '), warehouse: warehouseName },
      };
};
