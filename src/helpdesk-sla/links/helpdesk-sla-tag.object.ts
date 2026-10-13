import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_FIELD_UNIVERSAL_IDENTIFIERS as POLICY_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskSlaTag',
  namePlural: 'helpdeskSlaTags',
  labelSingular: 'SLA policy tag link',
  labelPlural: 'SLA policy tag links',
  description: 'Limits an SLA policy to cases with a tag',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.sla,
      name: 'sla',
      label: 'SLA policy',
      icon: 'IconHourglass',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: POLICY_IDS.tags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.tag,
      name: 'tag',
      label: 'Tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.tagSlaPolicyLinks,
    }),
  ],
});
