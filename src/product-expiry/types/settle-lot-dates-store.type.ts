import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type LotDateFields } from 'src/product-expiry/utils/types/lot-date-fields.type';

export type SettleLotDatesStore = {
  readLots: (ids: string[]) => Promise<(LotDateFields & { id: string; productId: string | null })[]>;
  readExpiryTimes: (productIds: string[]) => Promise<Map<string, ExpiryTimes>>;
  updateLot: (id: string, data: Partial<LotDateFields>) => Promise<void>;
  recomputeLotExpiry: (lotIds: string[], now: Date) => Promise<void>;
  syncLotDateCopies: (lotIds: string[]) => Promise<void>;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
  now: () => Date;
};
