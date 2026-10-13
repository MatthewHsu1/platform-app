import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  REVERT_INVENTORY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REVERT_INVENTORY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: REVERT_INVENTORY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-move-line-revert-inventory',
  description: 'Undoes the selected inventory adjustment lines.',
  component: makeStockCommand({
    routePath: REVERT_INVENTORY_ROUTE_PATH,
    idsName: 'moveLineIds',
    successMessage: msg('Inventory adjustments reverted.'),
    fallbackError: msg('The inventory adjustments could not be reverted.'),
  }),
});
