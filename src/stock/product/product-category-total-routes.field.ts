import { defineField } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten, oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_TOTAL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...appWritten(
    oneToManyField({
      universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryTotalRoutes,
      name: 'totalRoutes',
      label: 'Total routes',
      icon: 'IconRoute',
      targetObjectUniversalIdentifier: STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_ROUTE_CATEG_TOTAL_FIELD_UNIVERSAL_IDENTIFIERS.productCategory,
    }),
  ),
  objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
});
