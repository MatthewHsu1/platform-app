import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_PRODUCT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-product/helpdesk-product-universal-identifiers.constant';
import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.productProductHelpdeskTickets,
    name: 'helpdeskTickets',
    label: 'Work cases',
    icon: 'IconLifebuoy',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: INVERSE_IDS.helpdeskTicketProduct,
  }),
  objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
});
