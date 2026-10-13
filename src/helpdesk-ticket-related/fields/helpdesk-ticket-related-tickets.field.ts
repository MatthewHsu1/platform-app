import { defineField } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_RELATED_FIELD_UNIVERSAL_IDENTIFIERS as RELATED_IDS,
  HELPDESK_TICKET_RELATED_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-ticket-related/helpdesk-ticket-related-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.relatedTickets,
    name: 'relatedTickets',
    label: 'Related cases',
    icon: 'IconLink',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: RELATED_IDS.ticket,
    junctionTargetFieldUniversalIdentifier: RELATED_IDS.relatedTicket,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
