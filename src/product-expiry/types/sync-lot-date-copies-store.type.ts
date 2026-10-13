import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';
import { type LotQuant } from 'src/product-expiry/utils/types/lot-quant.type';

export type SyncLotDateCopiesStore = {
  readLotsAndQuants: (lotIds: string[]) => Promise<{ lots: (LotExpiry & { id: string })[]; quants: LotQuant[] }>;
  compareAndSet: (id: string, version: number, data: Record<string, unknown>) => Promise<boolean>;
  settleLotLineDates: (lotIds: string[]) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  now: () => string;
  digits: () => number;
};
