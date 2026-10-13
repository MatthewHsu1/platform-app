import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveRoutes,
    name: 'routes',
    label: 'Destination route',
    icon: 'IconRoute',
    targetObjectUniversalIdentifier: STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.stockMove,
    junctionTargetFieldUniversalIdentifier: STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
  }),
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
});
