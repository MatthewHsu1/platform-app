import { type PricedProduct } from 'src/product/utils/types/priced-product.type';

// A product template or variant to label. `name` is the stored name: a variant's already holds its
// internal reference and attribute values.
export type LabelProduct = {
  id: string;
  isVariant: boolean;
  templateName: string;
  name: string;
  defaultCode: string;
  barcode: string;
  isService: boolean;
  priced: PricedProduct;
  referenceUnitName: string | null;
};
