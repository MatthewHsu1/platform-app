import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  CLEAR_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: CLEAR_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-clear-count',
  description: 'Clears the count of the open stock row.',
  component: makeStockCommand({
    routePath: CLEAR_COUNTS_ROUTE_PATH,
    idsName: 'quantIds',
    extraBody: { row: true },
    successMessage: msg('Count cleared.'),
    fallbackError: msg('The count could not be cleared.'),
  }),
});
