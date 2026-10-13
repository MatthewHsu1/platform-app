import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type ProductLotFields = {
  isStorable: boolean;
  tracking: ProductTracking;
  useExpirationDate: boolean;
  lotSequenceId: string | null;
  serialPrefixFormat: string | null;
};
