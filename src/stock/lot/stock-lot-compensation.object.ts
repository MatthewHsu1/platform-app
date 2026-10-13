import {
  defineObject,
  FieldType,
  MetadataWritability,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appTextField, appWritten, manyToOneField, numberField } from 'src/shared/fields';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOT_COMPENSATION_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOT_COMPENSATION_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_LOT_COMPENSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// A done line took a lot below zero, so stock without a lot at the same place was turned into that lot. There is no
// move line for this transfer: the stock checks add these rows to the done lines of both keys. Only the app writes
// them, so staff can neither make one nor put one in the trash.
export default defineObject({
  universalIdentifier: STOCK_LOT_COMPENSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockLotCompensation',
  namePlural: 'stockLotCompensations',
  labelSingular: 'Lot stock compensation',
  labelPlural: 'Lot stock compensations',
  description: 'Stock without a lot turned into a lot that a done move line took below zero',
  icon: 'IconArrowsExchange',
  isUICreatable: false,
  isUIEditable: false,
  writability: MetadataWritability.APPLICATION,
  fields: [
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.moveLine,
        name: 'moveLine',
        label: 'Move line',
        icon: 'IconListDetails',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.stockMoveLineLotCompensations,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.product,
        name: 'product',
        label: 'Product',
        icon: 'IconBoxMultiple',
        onDelete: OnDeleteAction.RESTRICT,
        targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.productProductLotCompensations,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.location,
        name: 'location',
        label: 'Location',
        icon: 'IconMapPin',
        onDelete: OnDeleteAction.RESTRICT,
        targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.stockLocationLotCompensations,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.lot,
        name: 'lot',
        label: 'Lot/Serial Number',
        icon: 'IconBarcode',
        onDelete: OnDeleteAction.RESTRICT,
        targetObjectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.stockLotCompensations,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.owner,
        name: 'owner',
        label: 'Owner',
        icon: 'IconBuildingSkyscraper',
        onDelete: OnDeleteAction.RESTRICT,
        targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
        targetFieldUniversalIdentifier: INVERSE_IDS.companyLotCompensations,
      }),
    ),
    appWritten(numberField(FIELD_IDS.quantity, 'quantity', 'Quantity', 'IconStack2', { decimals: 2 })),
    appWritten({
      universalIdentifier: FIELD_IDS.date,
      name: 'date',
      label: 'Date',
      icon: 'IconCalendarEvent',
      type: FieldType.DATE_TIME,
    }),
    appTextField(FIELD_IDS.lotKey, 'lotKey', 'Stock key of the lot', 'IconKey'),
    appTextField(FIELD_IDS.noLotKey, 'noLotKey', 'Stock key without a lot', 'IconKey'),
  ],
});
