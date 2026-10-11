import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { linkIndexConfig } from 'src/stock/route/link-definitions';

export default defineIndex(
  linkIndexConfig({
    objectUniversalIdentifier: STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    ids: [STOCK_LOCATION_STOCK_PICKING_TYPE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER, INDEX_FIELD_IDS.stockPickingType, INDEX_FIELD_IDS.stockLocation],
    fieldUniversalIdentifiers: [FIELD_IDS.stockPickingType, FIELD_IDS.stockLocation],
  }),
);
