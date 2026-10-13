import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTagRel',
  namePlural: 'helpdeskTicketTagRels',
  labelSingular: 'Work case tag link',
  labelPlural: 'Work case tag links',
  description: 'Puts a tag on a work case',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.ticket,
      name: 'ticket',
      label: 'Work case',
      icon: 'IconLifebuoy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS.tags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.tag,
      name: 'tag',
      label: 'Tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: HELPDESK_TICKET_TAG_FIELD_UNIVERSAL_IDENTIFIERS.caseLinks,
    }),
  ],
});
