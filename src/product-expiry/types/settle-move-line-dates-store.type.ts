import { type DatedMoveLine } from 'src/product-expiry/types/dated-move-line.type';
import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';

export type SettleMoveLineDatesStore = {
  readLines: (lineIds: string[]) => Promise<DatedMoveLine[]>;
  readTransferLines: (pickingIds: string[]) => Promise<DatedMoveLine[]>;
  readLotLines: (lotIds: string[]) => Promise<DatedMoveLine[]>;
  readExpiryTimes: (productIds: string[]) => Promise<Map<string, ExpiryTimes>>;
  writeLines: (updates: { id: string; data: Partial<LotExpiry> }[]) => Promise<void>;
  now: () => Date;
};
