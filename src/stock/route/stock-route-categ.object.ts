import { defineObject } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_ROUTE_CATEG_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockRouteCateg',
    namePlural: 'stockRouteCategs',
    labelSingular: 'Route category link',
    labelPlural: 'Route category links',
    description: 'Offers a route on a product category',
    sides: [
      {
        universalIdentifier: STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS.productCategory,
        name: 'productCategory',
        label: 'Product Category',
        icon: 'IconCategory',
        targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryRoutes,
      },
      {
        universalIdentifier: STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.categs,
      },
    ],
  }),
);
