import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  appWritten,
  manyToOneField,
  numberField,
  oneToManyField,
  textField,
} from 'src/shared/fields';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The name stays empty when saved without one; the lot trigger fills it from
// the product's lot sequence, so it carries no required rule.
export default defineObject({
  universalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockLot',
  namePlural: 'stockLots',
  labelSingular: 'Lot/Serial Number',
  labelPlural: 'Lots/Serial Numbers',
  description: 'A lot or serial number of a tracked product',
  icon: 'IconBarcode',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Lot/Serial Number', 'IconBarcode'),
    textField(FIELD_IDS.ref, 'ref', 'Internal Reference', 'IconHash'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.productProductStockLots,
    }),
    {
      universalIdentifier: FIELD_IDS.note,
      name: 'note',
      label: 'Description',
      icon: 'IconNotes',
      type: FieldType.RICH_TEXT,
    },
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'Location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockLocationStockLots,
    }),
    appWritten(numberField(FIELD_IDS.productQty, 'productQty', 'On Hand Quantity', 'IconBox')),
    oneToManyField({
      universalIdentifier: FIELD_IDS.quants,
      name: 'quants',
      label: 'Quants',
      icon: 'IconBox',
      targetObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockQuantLot,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.moveLines,
      name: 'moveLines',
      label: 'Move lines',
      icon: 'IconListDetails',
      targetObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockMoveLineLot,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.scraps,
      name: 'scraps',
      label: 'Scraps',
      icon: 'IconTrash',
      targetObjectUniversalIdentifier: STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockScrapLot,
    }),
  ],
});
