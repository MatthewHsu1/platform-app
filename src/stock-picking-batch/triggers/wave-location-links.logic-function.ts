import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { waveLocationLinks } from 'src/stock-picking-batch/stock-picking-batch-records';
import { STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.waveLocationLinks,
  name: 'platform-stock-wave-location-links',
  description: 'Deletes a removed wave location link for good, so the same location can be added again.',
  timeoutSeconds: 30,
  handler: destroyDeletedLinksHandler(waveLocationLinks),
  databaseEventTriggerSettings: { eventName: 'stockLocationStockPickingTypeRel.*', batchMode: true },
});
