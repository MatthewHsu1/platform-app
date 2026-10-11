import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Transfer references are unique; an empty reference before numbering does not clash.
export default defineIndex({
  universalIdentifier: STOCK_PICKING_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: STOCK_PICKING_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIERS.name,
      fieldUniversalIdentifier: STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS.name,
    },
  ],
});
