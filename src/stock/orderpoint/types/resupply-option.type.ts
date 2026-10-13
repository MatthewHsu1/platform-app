// A warehouse that can resupply a reordering rule's warehouse through one route.
export type ResupplyOption = {
  routeId: string;
  routeName: string;
  warehouseName: string;
  locationName: string;
  freeQty: number;
  leadTime: number;
  tooLow: boolean;
};
