import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
} from 'src/stock/stock-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.uomUomStockMoveLines,
    name: 'stockMoveLines',
    label: 'Move lines',
    icon: 'IconListDetails',
    targetObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS.productUom,
  }),
  objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
});
