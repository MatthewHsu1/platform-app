import { defineLogicFunction } from 'twenty-sdk/define';

import { stockReferenceFsmOrderRels } from 'src/fieldservice-stock/fieldservice-stock-records';
import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockReferenceFsmOrderRel,
  name: 'platform-stock-reference-fsm-order-rel',
  description: 'Removes an order reference link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockReferenceFsmOrderRels),
  databaseEventTriggerSettings: { eventName: 'stockReferenceFsmOrderRel.*', batchMode: true },
});
