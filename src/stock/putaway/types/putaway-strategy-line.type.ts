export type PutawayStrategyLine = {
  id: string;
  moveId: string | null;
  productId: string;
  quantity: number | null;
  productUomId: string | null;
  quantityProductUom: number | null;
  locationDestId: string;
  resultPackageId: string | null;
};
