import { defineIndex } from 'twenty-sdk/define';

import {
  FSM_ORDER_FSM_PERSON_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ORDER_FSM_PERSON_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FSM_PERSON_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FSM_PERSON_REL_INDEX_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: FSM_ORDER_FSM_PERSON_REL_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: FSM_ORDER_FSM_PERSON_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.order,
    },
    {
      universalIdentifier: FSM_ORDER_FSM_PERSON_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.person,
    },
  ],
});
