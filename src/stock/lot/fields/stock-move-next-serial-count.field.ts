import { defineField } from 'twenty-sdk/define';

import { numberField } from 'src/shared/fields';
import {
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...numberField(RELATION_IDS.stockMoveNextSerialCount, 'nextSerialCount', 'Number of SN/Lots', 'IconListNumbers', {
    int: true,
    decimals: 0,
  }),
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
});
