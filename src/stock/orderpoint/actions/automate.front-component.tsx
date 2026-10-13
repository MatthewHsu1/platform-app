import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.automate,
  name: 'stock-orderpoint-automate',
  description: 'Makes the selected manual reordering rules automatic and orders them.',
  isHeadless: true,
  component: makeStockCommand({
    routePath: ORDERPOINT_ROUTE_PATHS.order,
    idsName: 'orderpointIds',
    extraBody: { mode: 'AUTOMATE' },
    fallbackError: msg('Could not automate.'),
  }),
});
