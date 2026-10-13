import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_PICKING_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_MOVE_PICKING_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: STOCK_MOVE_PICKING_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [{ universalIdentifier: INDEX_FIELD_IDS.picking, fieldUniversalIdentifier: FIELD_IDS.picking }],
});
