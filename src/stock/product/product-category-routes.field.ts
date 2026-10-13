import { defineField } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryRoutes,
    name: 'routes',
    label: 'Routes',
    icon: 'IconRoute',
    targetObjectUniversalIdentifier: STOCK_ROUTE_CATEG_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS.productCategory,
    junctionTargetFieldUniversalIdentifier: STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
  }),
  objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
});
