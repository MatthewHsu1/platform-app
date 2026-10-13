import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_PACKAGE_TYPE_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_STORAGE_CATEGORY_CAPACITY_PACKAGE_TYPE_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

// One capacity per package type and storage category.
export default defineIndex({
  universalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_PACKAGE_TYPE_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.packageType, fieldUniversalIdentifier: FIELD_IDS.packageType },
    { universalIdentifier: INDEX_FIELD_IDS.storageCategory, fieldUniversalIdentifier: FIELD_IDS.storageCategory },
  ],
});
