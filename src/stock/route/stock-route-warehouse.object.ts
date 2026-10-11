import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_ROUTE_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockRouteWarehouse',
    namePlural: 'stockRouteWarehouses',
    labelSingular: 'Route warehouse link',
    labelPlural: 'Route warehouse links',
    description: 'Makes a route a default route of a warehouse',
    sides: [
      {
        universalIdentifier: STOCK_ROUTE_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouse,
        name: 'stockWarehouse',
        label: 'Warehouse',
        icon: 'IconBuildingWarehouse',
        targetObjectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseRoutes,
      },
      {
        universalIdentifier: STOCK_ROUTE_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.warehouses,
      },
    ],
  }),
);
