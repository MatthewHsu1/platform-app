import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_TAG_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.tagSlaPolicyLinks,
    name: 'slaPolicyLinks',
    label: 'SLA policies',
    icon: 'IconHourglass',
    targetObjectUniversalIdentifier: HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.tag,
    junctionTargetFieldUniversalIdentifier: LINK_IDS.sla,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
});
