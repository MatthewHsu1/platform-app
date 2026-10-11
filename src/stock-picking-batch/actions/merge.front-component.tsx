import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import {
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { makeStockCommand } from 'src/stock/stock-command';

export default defineFrontComponent({
  universalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.merge,
  name: 'stock-picking-batch-merge',
  description: 'Merges the selected batches into the first one selected.',
  isHeadless: true,
  component: makeStockCommand({
    routePath: STOCK_PICKING_BATCH_ROUTE_PATHS.merge,
    idsName: 'batchIds',
    fallbackError: msg('Could not merge.'),
  }),
});
