import { defineIndex } from 'twenty-sdk/define';

import { linkIndexConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_MOVE_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_ROUTE_MOVE_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex(
  linkIndexConfig({
    objectUniversalIdentifier: STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    ids: [STOCK_ROUTE_MOVE_PAIR_INDEX_UNIVERSAL_IDENTIFIER, INDEX_FIELD_IDS.stockMove, INDEX_FIELD_IDS.stockRoute],
    fieldUniversalIdentifiers: [FIELD_IDS.stockMove, FIELD_IDS.stockRoute],
  }),
);
