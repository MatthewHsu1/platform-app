import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_TICKET_SLA_FIELD_UNIVERSAL_IDENTIFIERS as ROW_IDS,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.helpdeskTicketTicketSlas,
    name: 'ticketSlas',
    label: 'Case SLAs',
    icon: 'IconHourglass',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: ROW_IDS.ticket,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
