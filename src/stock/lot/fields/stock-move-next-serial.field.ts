import { defineField } from 'twenty-sdk/define';

import { textField } from 'src/shared/fields';
import {
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...textField(RELATION_IDS.stockMoveNextSerial, 'nextSerial', 'First SN/Lot', 'IconBarcode'),
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
});
