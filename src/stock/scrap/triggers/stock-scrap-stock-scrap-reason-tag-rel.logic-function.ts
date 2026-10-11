import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockScrapStockScrapReasonTagRels } from 'src/stock/stock-records';
import { STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-scrap-reason-tag-rel',
  description: 'Removes a scrap reason link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockScrapStockScrapReasonTagRels),
  databaseEventTriggerSettings: { eventName: 'stockScrapStockScrapReasonTagRel.*', batchMode: true },
});
