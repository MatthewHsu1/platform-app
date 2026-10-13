import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_WAREHOUSE_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: STOCK_WAREHOUSE_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS.name,
    },
  ],
});
