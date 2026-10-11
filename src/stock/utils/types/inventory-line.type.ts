export type InventoryLine = {
  id: string;
  isInventory: boolean;
  reference: string | null;
  productId: string;
  productUomId: string;
  quantity: number;
  quantityProductUom: number | null;
  locationId: string;
  locationDestId: string;
  lotId: string | null;
  packageId: string | null;
  resultPackageId: string | null;
  ownerId: string | null;
};
