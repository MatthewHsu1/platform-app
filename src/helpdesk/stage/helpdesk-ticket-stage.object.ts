import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS as TICKET_IDS,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as STAGE_TEAM_IDS,
  HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { activeField, booleanField, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';

// Code reads Unattended and Closed: an unattended case counts for its team's
// attention list, and a case in a closed stage leaves the open counts. A stage
// with no team is open to every team.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketStage',
  namePlural: 'helpdeskTicketStages',
  labelSingular: 'Work case stage',
  labelPlural: 'Work case stages',
  description: 'A step a work case moves through, from new to closed',
  icon: 'IconProgress',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    {
      universalIdentifier: FIELD_IDS.description,
      name: 'description',
      label: 'Description',
      icon: 'IconFileText',
      type: FieldType.RICH_TEXT,
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 1 }),
    activeField(FIELD_IDS.active),
    booleanField(FIELD_IDS.unattended, 'unattended', 'Unattended', 'IconAlertCircle', false),
    booleanField(FIELD_IDS.closed, 'closed', 'Closed', 'IconCircleCheck', false),
    booleanField(FIELD_IDS.fold, 'fold', 'Folded on the board', 'IconLayoutKanban', false),
    oneToManyField({
      universalIdentifier: FIELD_IDS.teams,
      name: 'teams',
      label: 'Teams',
      icon: 'IconUsersGroup',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STAGE_TEAM_IDS.stage,
      junctionTargetFieldUniversalIdentifier: STAGE_TEAM_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.helpdeskTickets,
      name: 'helpdeskTickets',
      label: 'Cases',
      icon: 'IconLifebuoy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TICKET_IDS.stage,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
