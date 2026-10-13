import { type LastSave } from 'src/product/variant/types/last-save.type';
import { type Currency } from 'src/product/variant/types/currency.type';

export type VariantRow = LastSave & {
  id: string;
  name: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: Currency | null;
  weight: number | null;
  volume: number | null;
  priceExtra: Currency | null;
  lstPrice: Currency | null;
  combinationIndices: string | null;
  createdAt: string;
  deletedAt: string | null;
};
