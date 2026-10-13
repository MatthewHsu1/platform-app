import { defineField, FieldType } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { appWritten } from 'src/shared/fields';

// The earliest deadline of the case's SLA rows still in progress. The row trigger writes it.
export default defineField({
  ...appWritten({
    universalIdentifier: INVERSE_IDS.helpdeskTicketSlaDeadline,
    name: 'slaDeadline',
    label: 'SLA deadline',
    icon: 'IconCalendarDue',
    type: FieldType.DATE_TIME,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
