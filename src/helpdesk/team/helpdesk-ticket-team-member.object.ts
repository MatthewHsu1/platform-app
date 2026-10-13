import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTeamMember',
  namePlural: 'helpdeskTicketTeamMembers',
  labelSingular: 'Work case team member',
  labelPlural: 'Work case team members',
  description: 'Puts a staff member in a work case team',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Team',
      icon: 'IconUsersGroup',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.members,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.workspaceMember,
      name: 'workspaceMember',
      label: 'Member',
      icon: 'IconUserCircle',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.workspaceMemberHelpdeskTeamMembers,
    }),
  ],
});
