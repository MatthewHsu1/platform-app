import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_KEY_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_QUANT_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: STOCK_QUANT_KEY_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS.quantKey,
    },
  ],
});
