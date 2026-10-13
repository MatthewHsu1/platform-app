import { defineField, FieldType } from 'twenty-sdk/define';

import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  universalIdentifier: FIELD_IDS.lotAlertDate,
  name: 'alertDate',
  label: 'Alert Date',
  icon: 'IconCalendarExclamation',
  type: FieldType.DATE_TIME,
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
});
