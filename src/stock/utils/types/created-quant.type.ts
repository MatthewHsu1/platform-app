export type CreatedQuant = {
  id: string;
  productId: string;
  locationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
  inventoryQuantity: number | null;
  inventoryDate: string | null;
  assignedUserId: string | null;
};
