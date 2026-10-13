import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  appTextField,
  appWritten,
  booleanField,
  manyToOneField,
  numberField,
  selectField,
} from 'src/shared/fields';
import { MOVE_STATE, MOVE_STATE_OPTIONS } from 'src/stock/stock-options.constant';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

// Done lines are the ledger every stock level is checked against. The state
// is a copy of the move's, written with it.
export default defineObject({
  universalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockMoveLine',
  namePlural: 'stockMoveLines',
  labelSingular: 'Move line',
  labelPlural: 'Move lines',
  description: 'The quantity of a stock move taken from one exact stock and put in one exact place',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appTextField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.picking,
      name: 'picking',
      label: 'Transfer',
      icon: 'IconTruck',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS.moveLines,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.move,
      name: 'move',
      label: 'Stock move',
      icon: 'IconArrowsExchange',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.moveLines,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconBox',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.productProductStockMoveLines,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productUom,
      name: 'productUom',
      label: 'Unit',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.uomUomStockMoveLines,
    }),
    numberField(FIELD_IDS.quantity, 'quantity', 'Quantity', 'IconNumbers'),
    appWritten(numberField(FIELD_IDS.quantityProductUom, 'quantityProductUom', 'Quantity in product unit', 'IconNumbers')),
    booleanField(FIELD_IDS.picked, 'picked', 'Picked', 'IconChecks', false),
    {
      universalIdentifier: FIELD_IDS.date,
      name: 'date',
      label: 'Date',
      icon: 'IconCalendarEvent',
      type: FieldType.DATE_TIME,
      defaultValue: 'now',
    },
    manyToOneField({
      universalIdentifier: FIELD_IDS.owner,
      name: 'owner',
      label: 'From owner',
      icon: 'IconBuildingSkyscraper',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.companyOwnedStockMoveLines,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'From',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.moveLineSources,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.locationDest,
      name: 'locationDest',
      label: 'To',
      icon: 'IconMapPinFilled',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.moveLineDestinations,
    }),
    appWritten(selectField(FIELD_IDS.state, 'state', 'Status', 'IconProgressCheck', MOVE_STATE.DRAFT, MOVE_STATE_OPTIONS)),
  ],
});
