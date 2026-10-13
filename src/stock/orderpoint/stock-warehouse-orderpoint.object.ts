import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  activeField,
  appWritten,
  booleanField,
  manyToOneField,
  numberField,
  oneToManyField,
  selectField,
} from 'src/shared/fields';
import { STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';
import { ORDERPOINT_TRIGGER, ORDERPOINT_TRIGGER_OPTIONS } from 'src/stock/stock-options.constant';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

const quantity = (universalIdentifier: string, name: string, label: string, icon: string, defaultValue?: number) =>
  numberField(universalIdentifier, name, label, icon, { decimals: 2, defaultValue });

const dateField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.DATE as const,
});

// The app computes the quantities, dates and warnings, so they are app-written. To Order stays editable: staff
// type it on manual rows and the app keeps the typed value.
export default defineObject({
  universalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockWarehouseOrderpoint',
  namePlural: 'stockWarehouseOrderpoints',
  labelSingular: 'Reordering rule',
  labelPlural: 'Reordering rules',
  description: 'A minimum and maximum stock level of one product in one location',
  icon: 'IconRefresh',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    }),
    selectField(FIELD_IDS.trigger, 'trigger', 'Trigger', 'IconPlayerPlay', ORDERPOINT_TRIGGER.AUTO, ORDERPOINT_TRIGGER_OPTIONS),
    activeField(FIELD_IDS.active),
    dateField(FIELD_IDS.snoozedUntil, 'snoozedUntil', 'Snoozed', 'IconClockPause'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.warehouse,
      name: 'warehouse',
      label: 'Warehouse',
      icon: 'IconBuildingWarehouse',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockWarehouseOrderpoints,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'Location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockLocationOrderpoints,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.productProductOrderpoints,
    }),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.productCategory,
        name: 'productCategory',
        label: 'Product Category',
        icon: 'IconCategory',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: RELATION_IDS.productCategoryOrderpoints,
      }),
    ),
    quantity(FIELD_IDS.productMinQty, 'productMinQty', 'Min Quantity', 'IconArrowBarToDown', 0),
    quantity(FIELD_IDS.productMaxQty, 'productMaxQty', 'Max Quantity', 'IconArrowBarToUp', 0),
    manyToOneField({
      universalIdentifier: FIELD_IDS.replenishmentUom,
      name: 'replenishmentUom',
      label: 'Multiple',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.uomUomOrderpoints,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.route,
      name: 'route',
      label: 'Route',
      icon: 'IconRoute',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockRouteOrderpoints,
    }),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.effectiveRoute,
        name: 'effectiveRoute',
        label: 'Effective route',
        icon: 'IconRoute',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: RELATION_IDS.stockRouteEffectiveOrderpoints,
      }),
    ),
    appWritten(quantity(FIELD_IDS.qtyOnHand, 'qtyOnHand', 'On Hand', 'IconBox')),
    appWritten(quantity(FIELD_IDS.qtyForecast, 'qtyForecast', 'Forecast', 'IconChartLine')),
    quantity(FIELD_IDS.qtyToOrder, 'qtyToOrder', 'To Order', 'IconShoppingCart'),
    appWritten(quantity(FIELD_IDS.qtyToOrderComputed, 'qtyToOrderComputed', 'To Order Computed', 'IconCalculator')),
    appWritten(quantity(FIELD_IDS.qtyToOrderManual, 'qtyToOrderManual', 'To Order Manual', 'IconHandFinger', 0)),
    appWritten(quantity(FIELD_IDS.leadDays, 'leadDays', 'Lead days', 'IconClock')),
    appWritten(dateField(FIELD_IDS.leadHorizonDate, 'leadHorizonDate', 'Lead horizon date', 'IconCalendarEvent')),
    appWritten(dateField(FIELD_IDS.deadlineDate, 'deadlineDate', 'Deadline', 'IconCalendarDue')),
    appWritten(booleanField(FIELD_IDS.unwantedReplenish, 'unwantedReplenish', 'Unwanted Replenish', 'IconAlertTriangle', false)),
    appWritten(
      booleanField(FIELD_IDS.showSupplyWarning, 'showSupplyWarning', 'No replenishment route', 'IconAlertTriangle', false),
    ),
    appWritten(booleanField(FIELD_IDS.autoCreated, 'autoCreated', 'Made by the replenishment screen', 'IconRobot', false)),
    oneToManyField({
      universalIdentifier: FIELD_IDS.moves,
      name: 'moves',
      label: 'Moves',
      icon: 'IconArrowsExchange',
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockMoveOrderpoint,
    }),
  ],
});
