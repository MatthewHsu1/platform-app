import { defineField, FieldType } from 'twenty-sdk/define';

import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { appWritten } from 'src/shared/fields';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten({
    universalIdentifier: FIELD_IDS.quantExpirationDate,
    name: 'expirationDate',
    label: 'Expiration Date',
    icon: 'IconCalendarX',
    type: FieldType.DATE_TIME,
  }),
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
});
