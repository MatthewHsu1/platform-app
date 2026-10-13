import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_SLA_FIELD_UNIVERSAL_IDENTIFIERS as ROW_IDS,
  HELPDESK_SLA_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.stageExpectedSlaRows,
    name: 'expectedSlaRows',
    label: 'Case SLAs targeting this stage',
    icon: 'IconHourglass',
    targetObjectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: ROW_IDS.expectedStage,
  }),
  objectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
});
