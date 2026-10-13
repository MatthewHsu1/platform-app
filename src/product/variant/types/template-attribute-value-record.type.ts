import { type Currency } from 'src/product/variant/types/currency.type';

export type TemplateAttributeValueRecord = {
  id: string;
  name: string | null;
  ptavActive: boolean;
  productAttributeValueId: string | null;
  attributeLineId: string | null;
  productTmplId: string | null;
  priceExtra: Currency | null;
  deletedAt: string | null;
};
