// quantId and version are null when the key has done lines but no stock row.
export type LedgerDifference = {
  key: string;
  quantId: string | null;
  version: number | null;
  quantity: number;
  reservedQuantity: number;
  ledgerTotal: number;
};
