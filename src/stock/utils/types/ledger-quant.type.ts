// The count fields are read when the row is fixed, so its count shows as outdated; the expiry fields, so the fixed
// row's available stock leaves out stock past its removal date.
export type LedgerQuant = {
  id: string;
  quantKey: string;
  quantity: number;
  reservedQuantity: number;
  version: number;
  inventoryQuantitySet?: boolean;
  inventoryQuantity?: number | null;
  inventoryDiffQuantity?: number | null;
  removalDate?: string | null;
  useExpirationDate?: boolean;
};
