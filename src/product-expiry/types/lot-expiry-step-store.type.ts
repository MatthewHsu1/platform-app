import { type AlertLot } from 'src/product-expiry/types/alert-lot.type';
import { type ExpiringQuant } from 'src/product-expiry/utils/types/expiring-quant.type';

export type LotExpiryStepStore = {
  readAlertLots: (cutoff: string) => Promise<AlertLot[]>;
  readStockedLotIds: (lotIds: string[]) => Promise<Set<string>>;
  addLotTask: (task: { id: string; lotId: string; title: string; body: string; assigneeId: string | null; dueAt: string }) => Promise<void>;
  markReminded: (lotId: string) => Promise<void>;
  readLotsToFlag: (now: string) => Promise<string[]>;
  recomputeLotExpiry: (lotIds: string[], now: Date) => Promise<void>;
  readStaleQuants: (now: string) => Promise<ExpiringQuant[]>;
  writeQuant: (write: { id: string; version: number; data: Record<string, unknown> }) => Promise<boolean>;
  readProductsWithExpiredStock: (cutoff: string) => Promise<string[]>;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
  digits: () => number;
  wait: (attempt: number) => Promise<void>;
};
