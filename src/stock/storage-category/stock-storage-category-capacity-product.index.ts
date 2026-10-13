import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_PRODUCT_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_STORAGE_CATEGORY_CAPACITY_PRODUCT_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

// One capacity per product and storage category.
export default defineIndex({
  universalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_PRODUCT_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.product, fieldUniversalIdentifier: FIELD_IDS.product },
    { universalIdentifier: INDEX_FIELD_IDS.storageCategory, fieldUniversalIdentifier: FIELD_IDS.storageCategory },
  ],
});
