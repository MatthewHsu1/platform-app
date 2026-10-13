import { defineLogicFunction } from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productVariantCombination,
  name: 'platform-product-variant-combination',
  description: 'Removes a variant value link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(
    records('productVariantCombination', 'productVariantCombinations'),
  ),
  databaseEventTriggerSettings: { eventName: 'productVariantCombination.*', batchMode: true },
});
