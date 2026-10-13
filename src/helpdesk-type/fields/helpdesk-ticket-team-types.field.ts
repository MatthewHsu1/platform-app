import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as TYPE_TEAM_IDS,
  HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TYPE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.helpdeskTicketTeamTypes,
    name: 'ticketTypes',
    label: 'Types',
    icon: 'IconTags',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: TYPE_TEAM_IDS.team,
    junctionTargetFieldUniversalIdentifier: TYPE_TEAM_IDS.ticketType,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
});
