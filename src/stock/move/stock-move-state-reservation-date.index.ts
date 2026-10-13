import { defineIndex } from 'twenty-sdk/define';

import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_STATE_RESERVATION_DATE_INDEX_FIELD_UNIVERSAL_IDENTIFIERS as INDEX_FIELD_IDS,
  STOCK_MOVE_STATE_RESERVATION_DATE_INDEX_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The daily job reserves waiting moves whose reservation date has come.
export default defineIndex({
  universalIdentifier: STOCK_MOVE_STATE_RESERVATION_DATE_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: false,
  fields: [
    { universalIdentifier: INDEX_FIELD_IDS.state, fieldUniversalIdentifier: FIELD_IDS.state },
    { universalIdentifier: INDEX_FIELD_IDS.reservationDate, fieldUniversalIdentifier: FIELD_IDS.reservationDate },
  ],
});
