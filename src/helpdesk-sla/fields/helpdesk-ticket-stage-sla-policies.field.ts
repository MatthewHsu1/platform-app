import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_FIELD_UNIVERSAL_IDENTIFIERS as POLICY_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.stageSlaPolicies,
    name: 'slaPolicies',
    label: 'SLA policies targeting this stage',
    icon: 'IconHourglass',
    targetObjectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: POLICY_IDS.stage,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
});
