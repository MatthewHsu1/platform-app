import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockReferenceMoveRels } from 'src/stock/stock-records';
import { STOCK_REFERENCE_MOVE_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: STOCK_REFERENCE_MOVE_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-reference-move-rel',
  description: 'Removes a reference link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockReferenceMoveRels),
  databaseEventTriggerSettings: { eventName: 'stockReferenceMoveRel.*', batchMode: true },
});
