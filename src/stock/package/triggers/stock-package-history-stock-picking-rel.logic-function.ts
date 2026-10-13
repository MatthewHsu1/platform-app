import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockPackageHistoryPickingLinks } from 'src/stock/package/package-records';
import { STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-package-history-stock-picking-rel',
  description: 'Removes a package history transfer link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockPackageHistoryPickingLinks),
  databaseEventTriggerSettings: { eventName: 'stockPackageHistoryStockPickingRel.*', batchMode: true },
});
