import { defineIndex } from 'twenty-sdk/define';

import {
  HELPDESK_SLA_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_SLA_TAG_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TAG_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TAG_INDEX_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: HELPDESK_SLA_TAG_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    { universalIdentifier: HELPDESK_SLA_TAG_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.sla },
    { universalIdentifier: HELPDESK_SLA_TAG_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER, fieldUniversalIdentifier: FIELD_IDS.tag },
  ],
});
