import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_RELATED_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_RELATED_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-ticket-related/helpdesk-ticket-related-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Related cases are related both ways: the related trigger makes the link back for a link staff make, and
// removes it with the link. A removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketRelated',
  namePlural: 'helpdeskTicketRelateds',
  labelSingular: 'Related work case link',
  labelPlural: 'Related work case links',
  description: 'Says that two work cases are related',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.ticket,
      name: 'ticket',
      label: 'Work case',
      icon: 'IconLifebuoy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.relatedTickets,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.relatedTicket,
      name: 'relatedTicket',
      label: 'Related work case',
      icon: 'IconLifebuoy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.relatedByTickets,
    }),
  ],
});
