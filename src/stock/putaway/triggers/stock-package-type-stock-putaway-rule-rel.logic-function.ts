import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockPackageTypeStockPutawayRuleRels } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPackageTypeStockPutawayRuleRel,
  name: 'platform-stock-package-type-stock-putaway-rule-rel',
  description: 'Removes a putaway package type link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockPackageTypeStockPutawayRuleRels),
  databaseEventTriggerSettings: { eventName: 'stockPackageTypeStockPutawayRuleRel.*', batchMode: true },
});
