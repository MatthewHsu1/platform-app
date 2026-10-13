import { defineField } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { selectField } from 'src/shared/fields';
import {
  PACKAGING_RESERVE_METHOD,
  PACKAGING_RESERVE_METHOD_OPTIONS,
} from 'src/stock/stock-options.constant';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

// Reservation compares against these values, so they are fixed in the app.
export default defineField({
  ...selectField(
    FIELD_IDS.productCategoryPackagingReserveMethod,
    'packagingReserveMethod',
    'Reserve packagings',
    'IconPackages',
    PACKAGING_RESERVE_METHOD.PARTIAL,
    PACKAGING_RESERVE_METHOD_OPTIONS,
  ),
  objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
});
