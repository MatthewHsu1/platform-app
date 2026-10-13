import { defineObject, FieldType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  activeField,
  appWritten,
  manyToOneField,
  numberField,
  oneToManyField,
  seedKeyField,
  selectField,
  textField,
} from 'src/shared/fields';
import {
  DELIVERY_STEPS,
  DELIVERY_STEPS_OPTIONS,
  RECEPTION_STEPS,
  RECEPTION_STEPS_OPTIONS,
} from 'src/stock/stock-options.constant';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_FIELD_IDS,
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as TYPE_FIELD_IDS,
  STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-universal-identifiers.constant';

const locationField = (universalIdentifier: string, name: string, label: string, inverseFieldId: string, onDelete: OnDeleteAction) =>
  appWritten(
    manyToOneField({
      universalIdentifier,
      name,
      label,
      icon: 'IconMapPin',
      onDelete,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: inverseFieldId,
    }),
  );

const typeField = (universalIdentifier: string, name: string, label: string, inverseFieldId: string) =>
  appWritten(
    manyToOneField({
      universalIdentifier,
      name,
      label,
      icon: 'IconArrowsExchange',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: inverseFieldId,
    }),
  );

// Code builds the locations, sequences and operation types of a warehouse;
// staff set the name, code and steps.
export default defineObject({
  universalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockWarehouse',
  namePlural: 'stockWarehouses',
  labelSingular: 'Warehouse',
  labelPlural: 'Warehouses',
  description: 'A building that holds stock, with its locations and operation types',
  icon: 'IconBuildingWarehouse',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Warehouse', icon: 'IconAbc', type: FieldType.TEXT },
    activeField(FIELD_IDS.active),
    manyToOneField({
      universalIdentifier: FIELD_IDS.partner,
      name: 'partner',
      label: 'Address',
      icon: 'IconBuildingSkyscraper',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      targetFieldUniversalIdentifier: STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyStockWarehouses,
    }),
    locationField(FIELD_IDS.viewLocation, 'viewLocation', 'View location', LOCATION_FIELD_IDS.warehouseViews, OnDeleteAction.RESTRICT),
    locationField(FIELD_IDS.lotStock, 'lotStock', 'Location stock', LOCATION_FIELD_IDS.warehouseLotStocks, OnDeleteAction.RESTRICT),
    textField(FIELD_IDS.code, 'code', 'Short name', 'IconHash'),
    selectField(FIELD_IDS.receptionSteps, 'receptionSteps', 'Incoming shipments', 'IconTruckLoading', RECEPTION_STEPS.ONE_STEP, RECEPTION_STEPS_OPTIONS),
    selectField(FIELD_IDS.deliverySteps, 'deliverySteps', 'Outgoing shipments', 'IconTruckDelivery', DELIVERY_STEPS.SHIP_ONLY, DELIVERY_STEPS_OPTIONS),
    locationField(FIELD_IDS.whInputStockLoc, 'whInputStockLoc', 'Input location', LOCATION_FIELD_IDS.warehouseInputs, OnDeleteAction.SET_NULL),
    locationField(FIELD_IDS.whQcStockLoc, 'whQcStockLoc', 'Quality control location', LOCATION_FIELD_IDS.warehouseQualityControls, OnDeleteAction.SET_NULL),
    locationField(FIELD_IDS.whOutputStockLoc, 'whOutputStockLoc', 'Output location', LOCATION_FIELD_IDS.warehouseOutputs, OnDeleteAction.SET_NULL),
    locationField(FIELD_IDS.whPackStockLoc, 'whPackStockLoc', 'Packing location', LOCATION_FIELD_IDS.warehousePackings, OnDeleteAction.SET_NULL),
    typeField(FIELD_IDS.inType, 'inType', 'Receipt type', TYPE_FIELD_IDS.inTypeWarehouses),
    typeField(FIELD_IDS.outType, 'outType', 'Delivery type', TYPE_FIELD_IDS.outTypeWarehouses),
    typeField(FIELD_IDS.intType, 'intType', 'Internal type', TYPE_FIELD_IDS.intTypeWarehouses),
    typeField(FIELD_IDS.pickType, 'pickType', 'Pick type', TYPE_FIELD_IDS.pickTypeWarehouses),
    typeField(FIELD_IDS.packType, 'packType', 'Pack type', TYPE_FIELD_IDS.packTypeWarehouses),
    typeField(FIELD_IDS.qcType, 'qcType', 'Quality control type', TYPE_FIELD_IDS.qcTypeWarehouses),
    typeField(FIELD_IDS.storeType, 'storeType', 'Storage type', TYPE_FIELD_IDS.storeTypeWarehouses),
    typeField(FIELD_IDS.xdockType, 'xdockType', 'Cross dock type', TYPE_FIELD_IDS.xdockTypeWarehouses),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.locations,
      name: 'locations',
      label: 'Locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_FIELD_IDS.warehouse,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.pickingTypes,
      name: 'pickingTypes',
      label: 'Operation types',
      icon: 'IconArrowsExchange',
      targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TYPE_FIELD_IDS.warehouse,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.moves,
      name: 'moves',
      label: 'Stock moves',
      icon: 'IconArrowsExchange',
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.warehouse,
    }),
  ],
});
