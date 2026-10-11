import { type ProductLotFields } from 'src/stock/utils/types/product-lot-fields.type';

export type ProductLotFieldsPlan = {
  data: Partial<Pick<ProductLotFields, 'tracking' | 'useExpirationDate' | 'lotSequenceId' | 'serialPrefixFormat'>>;
  createSequence: { name: string; code: string; prefix: string; padding: number } | null;
};
