import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_REFERENCE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_REFERENCE_MOVE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_REFERENCE_MOVE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_REFERENCE_MOVE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.reference, fieldUniversalIdentifier: FIELD_IDS.reference },
    { universalIdentifier: INDEX_FIELD_IDS.move, fieldUniversalIdentifier: FIELD_IDS.move },
  ],
});
