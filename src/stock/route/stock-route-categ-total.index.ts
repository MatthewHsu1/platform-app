import { defineIndex } from 'twenty-sdk/define';

import { linkIndexConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_ROUTE_CATEG_TOTAL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_CATEG_TOTAL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_ROUTE_CATEG_TOTAL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex(
  linkIndexConfig({
    objectUniversalIdentifier: STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
    ids: [STOCK_ROUTE_CATEG_TOTAL_PAIR_INDEX_UNIVERSAL_IDENTIFIER, INDEX_FIELD_IDS.productCategory, INDEX_FIELD_IDS.stockRoute],
    fieldUniversalIdentifiers: [FIELD_IDS.productCategory, FIELD_IDS.stockRoute],
  }),
);
