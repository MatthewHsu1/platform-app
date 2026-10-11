import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_PRODUCT_LOCATION_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_MOVE_LINE_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The ledger sums and the reserved recompute read lines by product, source and state.
export default defineIndex({
  universalIdentifier: STOCK_MOVE_LINE_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.product, fieldUniversalIdentifier: FIELD_IDS.product },
    { universalIdentifier: INDEX_FIELD_IDS.location, fieldUniversalIdentifier: FIELD_IDS.location },
    { universalIdentifier: INDEX_FIELD_IDS.state, fieldUniversalIdentifier: FIELD_IDS.state },
  ],
});
