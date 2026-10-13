import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_STAGE_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketStageTeam',
  namePlural: 'helpdeskTicketStageTeams',
  labelSingular: 'Work case stage team link',
  labelPlural: 'Work case stage team links',
  description: 'Limits a work case stage to a team',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.stage,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_STAGE_FIELD_UNIVERSAL_IDENTIFIERS.teams,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Team',
      icon: 'IconUsersGroup',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.stageLinks,
    }),
  ],
});
