import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_IGNORE_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_FIELD_UNIVERSAL_IDENTIFIERS as POLICY_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskSlaIgnoreStage',
  namePlural: 'helpdeskSlaIgnoreStages',
  labelSingular: 'SLA policy ignore stage link',
  labelPlural: 'SLA policy ignore stage links',
  description: 'Pauses an SLA policy while a case is in a stage',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.sla,
      name: 'sla',
      label: 'SLA policy',
      icon: 'IconHourglass',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: POLICY_IDS.ignoreStages,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.stage,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.stageSlaIgnoreLinks,
    }),
  ],
});
