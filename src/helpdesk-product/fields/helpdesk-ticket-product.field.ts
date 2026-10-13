import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_PRODUCT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-product/helpdesk-product-universal-identifiers.constant';
import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// The product picker lists every variant: Twenty cannot limit a picker, so "Available for work cases"
// on the product does not narrow it.
export default defineField({
  ...manyToOneField({
    universalIdentifier: INVERSE_IDS.helpdeskTicketProduct,
    name: 'product',
    label: 'Product',
    icon: 'IconPackage',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: INVERSE_IDS.productProductHelpdeskTickets,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
