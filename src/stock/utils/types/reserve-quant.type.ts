export type ReserveQuant = {
  id: string;
  productId: string;
  locationId: string;
  locationParentPath: string | null;
  locationCompleteName: string | null;
  ownerId: string | null;
  inDate: string | null;
  createdAt?: string | null;
  removalDate?: string | null;
  quantity: number;
  reservedQuantity: number;
  lotId: string | null;
  packageId: string | null;
  packageCreatedAt?: string | null;
};
