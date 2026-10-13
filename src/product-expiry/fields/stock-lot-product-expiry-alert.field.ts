import { defineField } from 'twenty-sdk/define';

import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { appWritten, booleanField } from 'src/shared/fields';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(booleanField(FIELD_IDS.lotProductExpiryAlert, 'productExpiryAlert', 'Expired', 'IconAlertTriangle', false)),
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
});
