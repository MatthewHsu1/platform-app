import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type PricedProduct = {
  templateId: string;
  variantId: string | null;
  templateVariantIds: string[];
  categPath: string | null;
  uom: ResolvedUom;
  currencyCode: string;
  listPrice: number;
  priceExtra: number;
  standardPrice: number;
};
