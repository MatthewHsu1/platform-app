import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { appWritten, booleanField } from 'src/shared/fields';

// True while any of the case's SLA rows is expired. The "SLA expired" list also catches a row in progress whose
// deadline has passed, so it needs no scheduled job.
export default defineField({
  ...appWritten(booleanField(INVERSE_IDS.helpdeskTicketSlaStateExpired, 'slaStateExpired', 'SLA row expired', 'IconAlarm', false)),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
