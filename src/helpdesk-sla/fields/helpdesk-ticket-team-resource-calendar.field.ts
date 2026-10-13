import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_TEAM_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/resource/resource-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// A new team takes the standard working hours (the team trigger), and staff may pick others.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.resourceCalendar,
    name: 'resourceCalendar',
    label: 'Working hours',
    icon: 'IconCalendarClock',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.resourceCalendarHelpdeskTeams,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
});
