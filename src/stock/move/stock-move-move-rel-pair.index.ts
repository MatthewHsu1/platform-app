import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_MOVE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_MOVE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_MOVE_MOVE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_MOVE_MOVE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.moveOrig, fieldUniversalIdentifier: FIELD_IDS.moveOrig },
    { universalIdentifier: INDEX_FIELD_IDS.moveDest, fieldUniversalIdentifier: FIELD_IDS.moveDest },
  ],
});
