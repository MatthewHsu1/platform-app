import { defineField } from 'twenty-sdk/define';

import { richTextField } from 'src/fieldservice/fieldservice-fields';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';

export default defineField({
  ...richTextField(FIELD_IDS.helpdeskTicketResolution, 'resolution', 'Resolution', 'IconNotes'),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
