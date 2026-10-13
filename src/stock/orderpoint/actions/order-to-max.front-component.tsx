import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.orderToMax,
  name: 'stock-orderpoint-order-to-max',
  description: 'Orders up to the maximum of the selected reordering rules.',
  isHeadless: true,
  component: makeStockCommand({
    routePath: ORDERPOINT_ROUTE_PATHS.order,
    idsName: 'orderpointIds',
    extraBody: { mode: 'ORDER_TO_MAX' },
    fallbackError: msg('Could not order to max.'),
  }),
});
