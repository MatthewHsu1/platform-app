export type InventoryQuant = {
  id: string;
  productId: string;
  productUomId: string;
  locationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
  quantity: number;
  inventoryQuantity: number | null;
  inventoryDiffQuantity: number | null;
  inventoryQuantitySet: boolean;
  propertyStockInventoryId: string | null;
};
