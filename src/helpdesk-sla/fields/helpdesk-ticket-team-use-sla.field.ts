import { defineField } from 'twenty-sdk/define';

import { HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_TEAM_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';

export default defineField({
  ...booleanField(FIELD_IDS.useSla, 'useSla', 'Use SLA', 'IconHourglass', false),
  objectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
});
