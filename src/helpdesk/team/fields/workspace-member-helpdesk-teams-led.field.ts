import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.workspaceMemberHelpdeskTeamsLed,
    name: 'helpdeskTeamsLed',
    label: 'Work case teams led',
    icon: 'IconUserStar',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.leader,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
