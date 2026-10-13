import { type LocationUsage } from 'src/stock/types/location-usage.type';

export type LocationRow = {
  id: string;
  name: string | null;
  completeName: string | null;
  active: boolean;
  usage: LocationUsage;
  locationId: string | null;
  parentPath: string | null;
  replenishLocation: boolean;
  barcode: string | null;
  cyclicInventoryFrequency: number | null;
  lastInventoryDate: string | null;
  nextInventoryDate: string | null;
  warehouseId: string | null;
  seedKey: string | null;
};
