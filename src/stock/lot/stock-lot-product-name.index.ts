import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOT_PRODUCT_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_LOT_PRODUCT_NAME_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// One lot name per product. Inside the save, so two receipts at once cannot
// make the same lot twice.
export default defineIndex({
  universalIdentifier: STOCK_LOT_PRODUCT_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.product, fieldUniversalIdentifier: FIELD_IDS.product },
    { universalIdentifier: INDEX_FIELD_IDS.name, fieldUniversalIdentifier: FIELD_IDS.name },
  ],
});
