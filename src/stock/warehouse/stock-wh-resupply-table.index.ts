import { defineIndex } from 'twenty-sdk/define';

import { linkIndexConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WH_RESUPPLY_TABLE_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_WH_RESUPPLY_TABLE_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineIndex(
  linkIndexConfig({
    objectUniversalIdentifier: STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
    ids: [STOCK_WH_RESUPPLY_TABLE_PAIR_INDEX_UNIVERSAL_IDENTIFIER, INDEX_FIELD_IDS.suppliedWh, INDEX_FIELD_IDS.supplierWh],
    fieldUniversalIdentifiers: [FIELD_IDS.suppliedWh, FIELD_IDS.supplierWh],
  }),
);
