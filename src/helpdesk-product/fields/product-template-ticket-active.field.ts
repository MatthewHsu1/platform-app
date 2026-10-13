import { defineField } from 'twenty-sdk/define';

import { HELPDESK_PRODUCT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-product/helpdesk-product-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';

export default defineField({
  ...booleanField(INVERSE_IDS.productTemplateTicketActive, 'ticketActive', 'Available for work cases', 'IconLifebuoy', true),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
