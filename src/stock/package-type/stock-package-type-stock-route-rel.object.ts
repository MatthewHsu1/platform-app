import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockPackageTypeStockRouteRel',
    namePlural: 'stockPackageTypeStockRouteRels',
    labelSingular: 'Package type route link',
    labelPlural: 'Package type route links',
    description: 'Offers a route on a package type',
    sides: [
      {
        universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPackageType,
        name: 'stockPackageType',
        label: 'Package Type',
        icon: 'IconBox',
        targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.routes,
      },
      {
        universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.packageTypes,
      },
    ],
  }),
);
