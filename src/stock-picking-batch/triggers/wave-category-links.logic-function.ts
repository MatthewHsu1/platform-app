import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { waveCategoryLinks } from 'src/stock-picking-batch/stock-picking-batch-records';
import { STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.waveCategoryLinks,
  name: 'platform-stock-wave-category-links',
  description: 'Deletes a removed wave category link for good, so the same category can be added again.',
  timeoutSeconds: 30,
  handler: destroyDeletedLinksHandler(waveCategoryLinks),
  databaseEventTriggerSettings: { eventName: 'productCategoryStockPickingTypeRel.*', batchMode: true },
});
