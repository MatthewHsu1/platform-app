import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTeamCategory',
  namePlural: 'helpdeskTicketTeamCategories',
  labelSingular: 'Work case team category link',
  labelPlural: 'Work case team category links',
  description: 'Lets a work case team take cases of a category',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Team',
      icon: 'IconUsersGroup',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.categories,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.category,
      name: 'category',
      label: 'Category',
      icon: 'IconCategory',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS.teamLinks,
    }),
  ],
});
