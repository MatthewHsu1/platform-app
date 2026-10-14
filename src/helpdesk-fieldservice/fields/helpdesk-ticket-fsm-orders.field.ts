import { defineField } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.helpdeskTicketFsmOrders,
    name: 'fsmOrders',
    label: 'Service orders',
    icon: 'IconTruck',
    targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.fsmOrderTicket,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
