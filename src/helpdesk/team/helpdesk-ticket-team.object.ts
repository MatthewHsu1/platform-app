import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS as TICKET_IDS,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as STAGE_TEAM_IDS,
  HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as TEAM_CATEGORY_IDS,
  HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS as MEMBER_IDS,
  HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { activeField, appTextField, appWritten, manyToOneField, numberField, oneToManyField, textField } from 'src/shared/fields';

const countField = (universalIdentifier: string, name: string, label: string) =>
  appWritten(numberField(universalIdentifier, name, label, 'IconListNumbers', { decimals: 0, int: true, defaultValue: 0 }));

// A team's four counts and its full name are written by the triggers.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTeam',
  namePlural: 'helpdeskTicketTeams',
  labelSingular: 'Work case team',
  labelPlural: 'Work case teams',
  description: 'A group of staff who work on the same cases',
  icon: 'IconUsersGroup',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    activeField(FIELD_IDS.active),
    manyToOneField({
      universalIdentifier: FIELD_IDS.leader,
      name: 'leader',
      label: 'Team leader',
      icon: 'IconUserStar',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberHelpdeskTeamsLed,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.parent,
      name: 'parent',
      label: 'Parent team',
      icon: 'IconHierarchy',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.children,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.children,
      name: 'children',
      label: 'Child teams',
      icon: 'IconHierarchy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.parent,
    }),
    appTextField(FIELD_IDS.completeName, 'completeName', 'Full name', 'IconAbc'),
    countField(FIELD_IDS.todoTicketCount, 'todoTicketCount', 'Open cases'),
    countField(FIELD_IDS.todoTicketCountUnassigned, 'todoTicketCountUnassigned', 'Open cases without assignee'),
    countField(FIELD_IDS.todoTicketCountUnattended, 'todoTicketCountUnattended', 'Unattended cases'),
    countField(FIELD_IDS.todoTicketCountHighPriority, 'todoTicketCountHighPriority', 'Very high priority cases'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.members,
      name: 'members',
      label: 'Members',
      icon: 'IconUsers',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: MEMBER_IDS.team,
      junctionTargetFieldUniversalIdentifier: MEMBER_IDS.workspaceMember,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.categories,
      name: 'categories',
      label: 'Categories',
      icon: 'IconCategory',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TEAM_CATEGORY_IDS.team,
      junctionTargetFieldUniversalIdentifier: TEAM_CATEGORY_IDS.category,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.stageLinks,
      name: 'stageLinks',
      label: 'Stages',
      icon: 'IconProgress',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STAGE_TEAM_IDS.team,
      junctionTargetFieldUniversalIdentifier: STAGE_TEAM_IDS.stage,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.helpdeskTickets,
      name: 'helpdeskTickets',
      label: 'Cases',
      icon: 'IconLifebuoy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TICKET_IDS.team,
    }),
  ],
});
