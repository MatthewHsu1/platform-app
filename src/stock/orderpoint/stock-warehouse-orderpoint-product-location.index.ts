import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_ORDERPOINT_PRODUCT_LOCATION_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// One reordering rule per product and location. Rows in the trash count too,
// so a deleted rule is destroyed at once to free its product and location.
export default defineIndex({
  universalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_PRODUCT_LOCATION_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.product, fieldUniversalIdentifier: FIELD_IDS.product },
    { universalIdentifier: INDEX_FIELD_IDS.location, fieldUniversalIdentifier: FIELD_IDS.location },
  ],
});
