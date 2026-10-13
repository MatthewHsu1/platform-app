import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';

export type AssignLotsStore = {
  readLines: (lineIds: string[]) => Promise<ValidateLineRow[]>;
  // Deleted lots too: the name stays taken while a lot is in the trash.
  findLots: (
    productIds: string[],
    names: string[],
  ) => Promise<{ id: string; name: string; productId: string; deletedAt: string | null }[]>;
  restoreLots: (lotIds: string[]) => Promise<void>;
  readExpiryTimes: (productIds: string[]) => Promise<Map<string, ExpiryTimes>>;
  now: () => Date;
  createMissingLots: (rows: { id: string; data: { productId: string; name: string } & Record<string, unknown> }[]) => Promise<void>;
  pointLines: (lineIds: string[], lotId: string) => Promise<void>;
  noteLotsMissing: (pickingId: string, productNames: string[]) => Promise<void>;
};
