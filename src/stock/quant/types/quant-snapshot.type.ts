export type QuantSnapshot = {
  id: string;
  quantKey: string;
  quantity: number;
  reservedQuantity: number;
  inDate: string | null;
  version: number;
  inventoryQuantitySet: boolean;
  inventoryQuantity: number | null;
  inventoryDiffQuantity: number | null;
  // A row read without them counts as stock that does not expire.
  removalDate?: string | null;
  useExpirationDate?: boolean;
};
