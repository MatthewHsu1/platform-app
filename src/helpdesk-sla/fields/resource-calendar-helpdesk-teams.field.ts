import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_TEAM_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/resource/resource-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.resourceCalendarHelpdeskTeams,
    name: 'helpdeskTeams',
    label: 'Work case teams',
    icon: 'IconUsersGroup',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.resourceCalendar,
  }),
  objectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
});
