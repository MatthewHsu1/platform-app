import { type LocationUsage } from 'src/stock/types/location-usage.type';

export type RoutingLocation = {
  id: string;
  name: string;
  completeName: string;
  parentId: string | null;
  parentPath: string;
  usage: LocationUsage;
  warehouseId: string | null;
};
