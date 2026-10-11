export type ResetLine = {
  productId: string;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
  quantityProductUom: number;
};
