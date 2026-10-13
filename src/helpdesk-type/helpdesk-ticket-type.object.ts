import { defineObject } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TYPE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as TYPE_TEAM_IDS,
  HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TYPE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { activeField, oneToManyField, textField } from 'src/shared/fields';

// The kinds of case a company works on. A team lists the types it takes, from either side of the link.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketType',
  namePlural: 'helpdeskTicketTypes',
  labelSingular: 'Work case type',
  labelPlural: 'Work case types',
  description: 'A kind of work case, such as a repair or a question',
  icon: 'IconTags',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.teams,
      name: 'teams',
      label: 'Teams',
      icon: 'IconUsersGroup',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TYPE_TEAM_IDS.ticketType,
      junctionTargetFieldUniversalIdentifier: TYPE_TEAM_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.helpdeskTickets,
      name: 'helpdeskTickets',
      label: 'Cases',
      icon: 'IconLifebuoy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.helpdeskTicketTicketType,
    }),
  ],
});
