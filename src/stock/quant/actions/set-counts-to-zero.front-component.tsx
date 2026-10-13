import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  SET_COUNTS_TO_ZERO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_TO_ZERO_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: SET_COUNTS_TO_ZERO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-set-counts-to-zero',
  description: 'Counts 0 on the selected stock rows.',
  component: makeStockCommand({
    routePath: SET_COUNTS_TO_ZERO_ROUTE_PATH,
    idsName: 'quantIds',
    successMessage: msg('Counts set to 0.'),
    fallbackError: msg('The counts could not be set to 0.'),
  }),
});
