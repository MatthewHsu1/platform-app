import { defineObject } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_ROUTE_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockRouteProduct',
    namePlural: 'stockRouteProducts',
    labelSingular: 'Route product link',
    labelPlural: 'Route product links',
    description: 'Offers a route on a product',
    sides: [
      {
        universalIdentifier: STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
        name: 'productTemplate',
        label: 'Product',
        icon: 'IconPackage',
        targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateRoutes,
      },
      {
        universalIdentifier: STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.products,
      },
    ],
  }),
);
