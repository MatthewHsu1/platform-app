import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.workspaceMemberHelpdeskTickets,
    name: 'helpdeskTickets',
    label: 'Work cases assigned',
    icon: 'IconLifebuoy',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS.assignedUser,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
