import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_PRODUCT_LOCATION_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_MOVE_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Forecasts and reservation look up open moves of a product between two locations.
export default defineIndex({
  universalIdentifier: STOCK_MOVE_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.product, fieldUniversalIdentifier: FIELD_IDS.product },
    { universalIdentifier: INDEX_FIELD_IDS.location, fieldUniversalIdentifier: FIELD_IDS.location },
    { universalIdentifier: INDEX_FIELD_IDS.locationDest, fieldUniversalIdentifier: FIELD_IDS.locationDest },
    { universalIdentifier: INDEX_FIELD_IDS.state, fieldUniversalIdentifier: FIELD_IDS.state },
  ],
});
