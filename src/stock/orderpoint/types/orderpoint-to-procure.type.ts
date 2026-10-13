// A reordering rule as ordering reads it: what to order, where, and from when.
export type OrderpointToProcure = {
  id: string;
  name: string;
  productId: string;
  productUomId: string;
  locationId: string;
  warehouseId: string | null;
  routeId: string | null;
  qtyToOrder: number;
  leadHorizonDate: string;
};
