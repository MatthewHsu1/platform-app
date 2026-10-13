import { defineField } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateRoutes,
    name: 'routes',
    label: 'Routes',
    icon: 'IconRoute',
    targetObjectUniversalIdentifier: STOCK_ROUTE_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
    junctionTargetFieldUniversalIdentifier: STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
  }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
