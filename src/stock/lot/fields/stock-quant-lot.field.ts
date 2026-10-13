import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: RELATION_IDS.stockQuantLot,
    name: 'lot',
    label: 'Lot/Serial Number',
    icon: 'IconBarcode',
    onDelete: OnDeleteAction.RESTRICT,
    targetObjectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS.quants,
  }),
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
});
