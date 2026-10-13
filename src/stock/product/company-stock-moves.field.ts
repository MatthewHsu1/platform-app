import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.companyStockMoves,
    name: 'stockMoves',
    label: 'Stock moves',
    icon: 'IconArrowsExchange',
    targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.company,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
