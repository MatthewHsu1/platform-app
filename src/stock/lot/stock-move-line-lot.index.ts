import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_LINE_LOT_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_LOT_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_MOVE_LINE_LOT_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [
    {
      universalIdentifier: STOCK_MOVE_LINE_LOT_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveLineLot,
    },
  ],
});
