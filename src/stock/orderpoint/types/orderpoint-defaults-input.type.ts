export type OrderpointDefaultsInput = {
  created: boolean;
  changedFields: string[];
  orderpoint: {
    warehouseId: string | null;
    locationId: string | null;
    productMinQty: number;
    productMaxQty: number;
    productCategoryId: string | null;
  };
  saved: { warehouseId: string | null; locationId: string | null };
  locationWarehouseId: string | null;
  warehouseLotStockIds: ReadonlyMap<string, string>;
  firstWarehouseId: string | null;
  productCategoryId: string | null;
};
