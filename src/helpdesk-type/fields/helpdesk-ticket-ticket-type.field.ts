import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TYPE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Twenty reserves the field name `type`, so the case's type is `ticketType`.
export default defineField({
  ...manyToOneField({
    universalIdentifier: INVERSE_IDS.helpdeskTicketTicketType,
    name: 'ticketType',
    label: 'Type',
    icon: 'IconTags',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: HELPDESK_TICKET_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.helpdeskTickets,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
});
