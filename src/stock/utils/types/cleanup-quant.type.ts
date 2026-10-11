export type CleanupQuant = {
  id: string;
  quantity: number;
  reservedQuantity: number;
  inventoryQuantity: number | null;
  assignedUserId: string | null;
};
