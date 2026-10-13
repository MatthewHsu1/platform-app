import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeStockCommand } from 'src/stock/stock-command';
import {
  SPLIT_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SPLIT_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

// Splitting a move off its transfer answers these texts in the user's
// language. The translation extractor reads only front-component files, so
// they are listed here to reach the catalog; each must match its source text.
export const MOVE_SPLIT_ROUTE_TEXTS = [
  msg("You cannot split a stock move that has been set to 'Done' or 'Cancel'."),
  msg('You cannot split a draft move. It needs to be confirmed first.'),
  msg('There is no quantity to split off this move.'),
];

export default defineFrontComponent({
  universalIdentifier: SPLIT_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-split-picking',
  description: 'Splits the open transfer into a backorder.',
  component: makeStockCommand({
    routePath: SPLIT_PICKING_ROUTE_PATH,
    idsName: 'pickingIds',
    successMessage: msg('Backorder created.'),
    fallbackError: msg('Could not split the transfer.'),
  }),
});
