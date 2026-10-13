import { defineField } from 'twenty-sdk/define';

import { textField } from 'src/shared/fields';
import {
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// A typed lot or serial name. On an operation type that makes lots, Validate sets the line to the product's lot
// with this name, or makes that lot first; a type that only picks existing lots refuses a line with a name alone.
export default defineField({
  ...textField(RELATION_IDS.stockMoveLineLotName, 'lotName', 'Lot/Serial Number Name', 'IconBarcode'),
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
});
