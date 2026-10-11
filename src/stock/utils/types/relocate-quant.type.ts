export type RelocateQuant = {
  id: string;
  productId: string;
  productUomId: string;
  locationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
  quantity: number;
};
