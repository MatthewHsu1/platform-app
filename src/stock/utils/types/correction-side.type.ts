export type CorrectionSide = {
  productId: string;
  locationId: string;
  locationDestId: string;
  ownerId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
  quantityProductUom: number;
};
