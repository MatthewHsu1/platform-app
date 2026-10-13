import { defineObject, FieldType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appTextField, appWritten, manyToOneField, numberField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_FIELD_IDS,
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

const quantity = (universalIdentifier: string, name: string, label: string, icon: string, defaultValue?: number) =>
  numberField(universalIdentifier, name, label, icon, { decimals: 2, ...(defaultValue === undefined ? {} : { defaultValue }) });

// One row per product, location, lot, package and owner (the unique key).
// On hand is a running balance the app writes with compare-and-set on
// `version`; staff type only counts.
export default defineObject({
  universalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockQuant',
  namePlural: 'stockQuants',
  labelSingular: 'Stock level',
  labelPlural: 'Stock levels',
  description: 'How much of a product is in one location, reserved and counted',
  icon: 'IconStack2',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({ universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.productProductStockQuants,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'Location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_FIELD_IDS.quants,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.owner,
      name: 'owner',
      label: 'Owner',
      icon: 'IconBuildingSkyscraper',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.companyOwnedStockQuants,
    }),
    appWritten(quantity(FIELD_IDS.quantity, 'quantity', 'Quantity', 'IconStack2', 0)),
    appWritten(quantity(FIELD_IDS.reservedQuantity, 'reservedQuantity', 'Reserved quantity', 'IconLock', 0)),
    appWritten(quantity(FIELD_IDS.availableQuantity, 'availableQuantity', 'Available quantity', 'IconCircleCheck', 0)),
    appWritten({ universalIdentifier: FIELD_IDS.inDate, name: 'inDate', label: 'Incoming date', icon: 'IconCalendarPlus', type: FieldType.DATE_TIME }),
    appTextField(FIELD_IDS.quantKey, 'quantKey', 'Key', 'IconKey'),
    appWritten(numberField(FIELD_IDS.version, 'version', 'Version', 'IconVersions', { decimals: 0, int: true, defaultValue: 0 })),
    quantity(FIELD_IDS.inventoryQuantity, 'inventoryQuantity', 'Counted quantity', 'IconClipboardCheck'),
    appWritten(quantity(FIELD_IDS.inventoryDiffQuantity, 'inventoryDiffQuantity', 'Difference', 'IconPlusMinus')),
    { universalIdentifier: FIELD_IDS.inventoryDate, name: 'inventoryDate', label: 'Scheduled date', icon: 'IconCalendarDue', type: FieldType.DATE },
    appWritten({
      universalIdentifier: FIELD_IDS.inventoryQuantitySet,
      name: 'inventoryQuantitySet',
      label: 'Inventory quantity set',
      icon: 'IconCheckbox',
      type: FieldType.BOOLEAN,
      defaultValue: false,
    }),
    appWritten({
      universalIdentifier: FIELD_IDS.isOutdated,
      name: 'isOutdated',
      label: 'Quantity has been moved since last count',
      icon: 'IconAlertTriangle',
      type: FieldType.BOOLEAN,
      defaultValue: false,
    }),
    appWritten({ universalIdentifier: FIELD_IDS.lastCountDate, name: 'lastCountDate', label: 'Last count date', icon: 'IconCalendarCheck', type: FieldType.DATE }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.assignedUser,
      name: 'assignedUser',
      label: 'Assigned to',
      icon: 'IconUserCircle',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberAssignedStockQuants,
    }),
  ],
});
