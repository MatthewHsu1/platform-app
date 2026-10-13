import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  MARK_AS_TODO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_AS_TODO_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: MARK_AS_TODO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-mark-as-todo',
  description: 'Marks the selected draft transfers as to do.',
  component: makeStockCommand({
    routePath: MARK_AS_TODO_ROUTE_PATH,
    idsName: 'pickingIds',
    successMessage: msg('Transfers marked as to do.'),
    fallbackError: msg('Could not mark the transfers as to do.'),
  }),
});
