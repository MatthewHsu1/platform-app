// The Replenish pop-up: its choices and the values it starts from. The
// forecast is in the product's own unit.
export type ReplenishForm = {
  hasVariants: boolean;
  variants: { id: string; name: string }[];
  variantId: string | null;
  units: { id: string; name: string }[];
  uomId: string;
  productUomName: string;
  warehouses: { id: string; name: string }[];
  warehouseId: string | null;
  routes: { id: string; name: string }[];
  routeId: string | null;
  quantity: number;
  forecast: number;
  datePlanned: string;
};
