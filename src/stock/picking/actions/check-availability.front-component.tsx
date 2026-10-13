import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  CHECK_AVAILABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CHECK_AVAILABILITY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: CHECK_AVAILABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-check-availability',
  description: 'Reserves stock for the selected transfers.',
  component: makeStockCommand({
    routePath: CHECK_AVAILABILITY_ROUTE_PATH,
    idsName: 'pickingIds',
    successMessage: msg('Availability checked.'),
    fallbackError: msg('Could not check the availability.'),
  }),
});
