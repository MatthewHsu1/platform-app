import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.fsmOrderTicket,
    name: 'ticket',
    label: 'Work case',
    icon: 'IconLifebuoy',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.helpdeskTicketFsmOrders,
  }),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
