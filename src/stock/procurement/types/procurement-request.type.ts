export type ProcurementRequest = {
  productId: string;
  productQty: number;
  productUomId: string;
  locationId: string;
  name: string;
  origin: string;
  values: Record<string, unknown>;
};
