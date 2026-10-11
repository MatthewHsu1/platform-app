import { defineField } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { selectField } from 'src/shared/fields';
import { PRODUCT_TRACKING, PRODUCT_TRACKING_OPTIONS } from 'src/stock/stock-options.constant';
import { STOCK_TRACKING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

// Code compares these values (lots at Validate, serial checks), so the list
// lives in code, not in the install step.
export default defineField({
  ...selectField(
    FIELD_IDS.templateTracking,
    'tracking',
    'Tracking',
    'IconBarcode',
    PRODUCT_TRACKING.NONE,
    PRODUCT_TRACKING_OPTIONS,
  ),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
