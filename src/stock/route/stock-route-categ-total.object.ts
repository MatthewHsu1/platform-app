import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten, booleanField, manyToOneField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_TOTAL_FIELD_UNIVERSAL_IDENTIFIERS as IDS,
  STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

// A category's routes with its ancestors' routes, kept by the app; rule search reads these rows.
export default defineObject({
  universalIdentifier: STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockRouteCategTotal',
  namePlural: 'stockRouteCategTotals',
  labelSingular: 'Category total route',
  labelPlural: 'Category total routes',
  description: 'A route a product category has, itself or through a parent category',
  icon: 'IconLink',
  fields: [
    appWritten(
      manyToOneField({
        universalIdentifier: IDS.productCategory,
        name: 'productCategory',
        label: 'Product Category',
        icon: 'IconCategory',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryTotalRoutes,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: IDS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.categoryTotals,
      }),
    ),
    appWritten(booleanField(IDS.inherited, 'inherited', 'From a parent category', 'IconHierarchy', false)),
  ],
});
