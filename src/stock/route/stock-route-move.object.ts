import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockRouteMove',
    namePlural: 'stockRouteMoves',
    labelSingular: 'Move route link',
    labelPlural: 'Move route links',
    description: 'A route a move prefers',
    sides: [
      {
        universalIdentifier: STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.stockMove,
        name: 'stockMove',
        label: 'Stock move',
        icon: 'IconArrowsExchange',
        targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveRoutes,
      },
      {
        universalIdentifier: STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
        name: 'stockRoute',
        label: 'Route',
        icon: 'IconRoute',
        targetObjectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.moves,
      },
    ],
  }),
);
