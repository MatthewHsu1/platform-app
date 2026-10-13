import { defineLogicFunction } from 'twenty-sdk/define';

import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplateUomUomRel,
  name: 'platform-product-template-uom-uom-rel',
  description: 'Removes a packaging link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('productTemplateUomUomRel', 'productTemplateUomUomRels')),
  databaseEventTriggerSettings: { eventName: 'productTemplateUomUomRel.*', batchMode: true },
});
