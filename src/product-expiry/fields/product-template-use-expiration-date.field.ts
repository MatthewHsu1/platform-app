import { defineField } from 'twenty-sdk/define';

import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';

export default defineField({
  ...booleanField(FIELD_IDS.templateUseExpirationDate, 'useExpirationDate', 'Use Expiration Date', 'IconCalendarX', false),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
