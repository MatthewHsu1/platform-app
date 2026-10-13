import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_IGNORE_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.stageSlaIgnoreLinks,
    name: 'slaIgnoreLinks',
    label: 'SLA policies that pause here',
    icon: 'IconPlayerPause',
    targetObjectUniversalIdentifier: HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.stage,
    junctionTargetFieldUniversalIdentifier: LINK_IDS.sla,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
});
