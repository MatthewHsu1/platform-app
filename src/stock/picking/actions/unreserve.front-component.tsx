import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  UNRESERVE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  UNRESERVE_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: UNRESERVE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-unreserve',
  description: 'Gives back the stock reserved for the selected transfers.',
  component: makeStockCommand({
    routePath: UNRESERVE_ROUTE_PATH,
    idsName: 'pickingIds',
    successMessage: msg('Reservations removed.'),
    fallbackError: msg('Could not remove the reservations.'),
  }),
});
