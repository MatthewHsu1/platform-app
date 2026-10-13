import { defineIndex } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_SLA_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_SLA_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_INDEX_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';

// One row per case and policy. The app takes a claim on the case before it writes its rows; this index is the
// second guard if two writers still meet.
export default defineIndex({
  universalIdentifier: HELPDESK_TICKET_SLA_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: HELPDESK_TICKET_SLA_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.ticket },
    { universalIdentifier: HELPDESK_TICKET_SLA_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.sla },
  ],
});
