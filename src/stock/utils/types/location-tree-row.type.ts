import { type LocationRow } from 'src/stock/types/location-row.type';

export type LocationTreeRow = Pick<
  LocationRow,
  | 'id'
  | 'name'
  | 'usage'
  | 'locationId'
  | 'completeName'
  | 'parentPath'
  | 'warehouseId'
  | 'nextInventoryDate'
  | 'replenishLocation'
  | 'cyclicInventoryFrequency'
  | 'lastInventoryDate'
>;
