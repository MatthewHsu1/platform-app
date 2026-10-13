import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_ROUTE_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_ROUTE_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_RULE_ROUTE_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [{ universalIdentifier: STOCK_RULE_ROUTE_INDEX_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.route }],
});
