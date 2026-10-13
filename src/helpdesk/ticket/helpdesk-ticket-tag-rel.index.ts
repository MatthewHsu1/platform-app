import { defineIndex } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TAG_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_INDEX_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: HELPDESK_TICKET_TAG_REL_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: HELPDESK_TICKET_TAG_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.ticket,
    },
    {
      universalIdentifier: HELPDESK_TICKET_TAG_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.tag,
    },
  ],
});
