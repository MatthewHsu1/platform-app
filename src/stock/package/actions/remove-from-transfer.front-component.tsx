import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import {
  REMOVE_FROM_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REMOVE_FROM_TRANSFER_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { makeStockCommand } from 'src/stock/stock-command';

export default defineFrontComponent({
  universalIdentifier: REMOVE_FROM_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-remove-from-transfer',
  description: 'Takes the selected packages out of their open transfers.',
  component: makeStockCommand({
    routePath: REMOVE_FROM_TRANSFER_ROUTE_PATH,
    idsName: 'packageIds',
    successMessage: msg('Packages removed from the transfer.'),
    fallbackError: msg('Could not remove the packages.'),
  }),
});
