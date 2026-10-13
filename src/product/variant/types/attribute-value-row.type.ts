import { type Currency } from 'src/product/variant/types/currency.type';

export type AttributeValueRow = {
  id: string;
  name: string | null;
  sequence: number | null;
  defaultExtraPrice: Currency | null;
};
