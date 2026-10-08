import { defineLogicFunction } from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTagProductTemplateRel,
  name: 'platform-product-tag-product-template-rel',
  description: 'Removes a product tag link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('productTagProductTemplateRel', 'productTagProductTemplateRels')),
  databaseEventTriggerSettings: { eventName: 'productTagProductTemplateRel.*', batchMode: true },
});
