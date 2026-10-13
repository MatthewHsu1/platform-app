import { type LedgerQuant } from 'src/stock/utils/types/ledger-quant.type';

export type LedgerStore = {
  storableProductIds: () => Promise<string[]>;
  // Done lines into each key minus done lines out of it, in the product unit.
  ledgerTotals: (productIds: string[]) => Promise<Map<string, number>>;
  quants: (productIds: string[]) => Promise<(LedgerQuant & { productId: string })[]>;
  compareAndSet: (id: string, version: number, data: Record<string, unknown>) => Promise<boolean>;
  // Puts back a soft-deleted row that holds the key (the unique key counts it, so no new row can be made).
  restoreQuant: (key: string) => Promise<LedgerQuant | null>;
  // null when another run made the key's row first.
  createQuant: (key: string, quantity: number) => Promise<string | null>;
  addNote: (quantId: string, body: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  now: () => string;
  digits: () => number;
};
