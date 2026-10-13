import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_PACKAGE_TYPE_BARCODE_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_BARCODE_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_PACKAGE_TYPE_BARCODE_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: STOCK_PACKAGE_TYPE_BARCODE_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.barcode,
    },
  ],
});
