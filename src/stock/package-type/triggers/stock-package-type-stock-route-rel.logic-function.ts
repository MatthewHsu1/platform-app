import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockPackageTypeStockRouteRels } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPackageTypeStockRouteRel,
  name: 'platform-stock-package-type-stock-route-rel',
  description: 'Removes a package type route link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockPackageTypeStockRouteRels),
  databaseEventTriggerSettings: { eventName: 'stockPackageTypeStockRouteRel.*', batchMode: true },
});
