import { defineField } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { textField } from 'src/shared/fields';
import { STOCK_TRACKING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

// The app keeps it equal to the prefix of the product's lot sequence. A prefix
// staff type picks the sequence with that prefix or makes one; an empty one
// goes back to the default serial number sequence.
export default defineField({
  ...textField(FIELD_IDS.templateSerialPrefixFormat, 'serialPrefixFormat', 'Custom Lot/Serial', 'IconBarcode'),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
