import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.resetManual,
  name: 'stock-orderpoint-reset-manual',
  description: 'Drops the typed quantity to order of the selected reordering rules.',
  isHeadless: true,
  component: makeStockCommand({
    routePath: ORDERPOINT_ROUTE_PATHS.resetManual,
    idsName: 'orderpointIds',
    fallbackError: msg('Could not reset the quantity.'),
  }),
});
