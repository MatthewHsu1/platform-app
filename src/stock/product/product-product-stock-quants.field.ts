import { defineField } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productProductStockQuants,
    name: 'stockQuants',
    label: 'Stock levels',
    icon: 'IconStack2',
    targetObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS.product,
  }),
  objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
});
