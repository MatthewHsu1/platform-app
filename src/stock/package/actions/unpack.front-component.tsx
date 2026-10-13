import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import {
  UNPACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  UNPACK_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { makeStockCommand } from 'src/stock/stock-command';

export default defineFrontComponent({
  universalIdentifier: UNPACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-unpack',
  description: 'Takes the content out of the selected packages.',
  component: makeStockCommand({
    routePath: UNPACK_ROUTE_PATH,
    idsName: 'packageIds',
    successMessage: msg('Packages unpacked.'),
    fallbackError: msg('Could not unpack the packages.'),
  }),
});
