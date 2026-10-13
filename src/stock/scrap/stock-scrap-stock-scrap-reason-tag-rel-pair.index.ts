import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.stockScrap, fieldUniversalIdentifier: FIELD_IDS.stockScrap },
    { universalIdentifier: INDEX_FIELD_IDS.stockScrapReasonTag, fieldUniversalIdentifier: FIELD_IDS.stockScrapReasonTag },
  ],
});
