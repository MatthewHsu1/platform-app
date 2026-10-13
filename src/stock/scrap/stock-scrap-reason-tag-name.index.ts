import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_SCRAP_REASON_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_REASON_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_REASON_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Tag names are unique.
export default defineIndex({
  universalIdentifier: STOCK_SCRAP_REASON_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: STOCK_SCRAP_REASON_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIERS.name,
      fieldUniversalIdentifier: STOCK_SCRAP_REASON_TAG_FIELD_UNIVERSAL_IDENTIFIERS.name,
    },
  ],
});
