import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { textField } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...textField(FIELD_IDS.personPickingWarnMsg, 'pickingWarnMsg', 'Message for stock picking', 'IconAlertTriangle'),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
