export type RouteRow = {
  id: string;
  name: string | null;
  active: boolean;
  sequence: number;
  productSelectable: boolean;
  productCategSelectable: boolean;
  warehouseSelectable: boolean;
  suppliedWhId: string | null;
  supplierWhId: string | null;
  // The warehouses the route is a default route of.
  warehouseIds: string[];
};
