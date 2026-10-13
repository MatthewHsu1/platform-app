import { records } from 'src/shared/triggers/records';

export const stockWarehouseOrderpoints = records('stockWarehouseOrderpoint', 'stockWarehouseOrderpoints');

export const ORDERPOINT_VALUE_SELECTION =
  'id name trigger active snoozedUntil productId locationId warehouseId routeId replenishmentUomId productMinQty productMaxQty qtyToOrderManual qtyOnHand qtyForecast qtyToOrderComputed qtyToOrder leadDays leadHorizonDate deadlineDate unwantedReplenish showSupplyWarning effectiveRouteId autoCreated productCategoryId';
