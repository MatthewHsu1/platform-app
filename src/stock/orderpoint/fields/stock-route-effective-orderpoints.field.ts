import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import { STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: RELATION_IDS.stockRouteEffectiveOrderpoints,
    name: 'effectiveOrderpoints',
    label: 'Reordering rules using it',
    icon: 'IconRefresh',
    targetObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS.effectiveRoute,
  }),
  objectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
});
