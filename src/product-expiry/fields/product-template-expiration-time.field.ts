import { defineField } from 'twenty-sdk/define';

import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { numberField } from 'src/shared/fields';

export default defineField({
  ...numberField(FIELD_IDS.templateExpirationTime, 'expirationTime', 'Expiration Date (days)', 'IconCalendarX', { int: true, decimals: 0, defaultValue: 0 }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
