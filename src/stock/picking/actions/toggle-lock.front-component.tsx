import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  TOGGLE_LOCK_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  TOGGLE_LOCK_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: TOGGLE_LOCK_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-toggle-lock-picking',
  description: 'Locks or unlocks the open transfer.',
  component: makeStockCommand({
    routePath: TOGGLE_LOCK_PICKING_ROUTE_PATH,
    idsName: 'pickingIds',
    successMessage: msg('Lock changed.'),
    fallbackError: msg('Could not lock or unlock the transfer.'),
  }),
});
