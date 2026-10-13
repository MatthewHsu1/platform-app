import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS as TICKET_IDS,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as TEAM_CATEGORY_IDS,
  HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { activeField, appTextField, manyToOneField, numberField, oneToManyField, textField } from 'src/shared/fields';

// Deleting a category deletes its child categories (the category trigger does it:
// a soft delete cascades nothing in Twenty).
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketCategory',
  namePlural: 'helpdeskTicketCategories',
  labelSingular: 'Work case category',
  labelPlural: 'Work case categories',
  description: 'A kind of problem, in a tree',
  icon: 'IconCategory',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    activeField(FIELD_IDS.active),
    manyToOneField({
      universalIdentifier: FIELD_IDS.parent,
      name: 'parent',
      label: 'Parent category',
      icon: 'IconHierarchy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.children,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.children,
      name: 'children',
      label: 'Child categories',
      icon: 'IconHierarchy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.parent,
    }),
    appTextField(FIELD_IDS.completeName, 'completeName', 'Full name', 'IconAbc'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.helpdeskTickets,
      name: 'helpdeskTickets',
      label: 'Cases',
      icon: 'IconLifebuoy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TICKET_IDS.category,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.teamLinks,
      name: 'teamLinks',
      label: 'Teams',
      icon: 'IconUsersGroup',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TEAM_CATEGORY_IDS.category,
      junctionTargetFieldUniversalIdentifier: TEAM_CATEGORY_IDS.team,
    }),
  ],
});
