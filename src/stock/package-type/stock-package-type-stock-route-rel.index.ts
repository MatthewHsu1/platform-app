import { defineIndex } from 'twenty-sdk/define';

import { linkIndexConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex(
  linkIndexConfig({
    objectUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    ids: [STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER, INDEX_FIELD_IDS.stockPackageType, INDEX_FIELD_IDS.stockRoute],
    fieldUniversalIdentifiers: [FIELD_IDS.stockPackageType, FIELD_IDS.stockRoute],
  }),
);
