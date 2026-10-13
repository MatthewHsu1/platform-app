import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as TYPE_IDS,
  HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TYPE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TYPE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// One link serves both sides: the types of a team and the teams of a type. A removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTypeTeam',
  namePlural: 'helpdeskTicketTypeTeams',
  labelSingular: 'Work case type team link',
  labelPlural: 'Work case type team links',
  description: 'Lets a work case team take work cases of a type',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.ticketType,
      name: 'ticketType',
      label: 'Type',
      icon: 'IconTags',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TYPE_IDS.teams,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Team',
      icon: 'IconUsersGroup',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.helpdeskTicketTeamTypes,
    }),
  ],
});
