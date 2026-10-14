import { defineIndex } from 'twenty-sdk/define';

import {
  FSM_LOCATION_PERSON_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_LOCATION_PERSON_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_PERSON_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_PERSON_INDEX_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: FSM_LOCATION_PERSON_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: FSM_LOCATION_PERSON_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.location,
    },
    {
      universalIdentifier: FSM_LOCATION_PERSON_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.person,
    },
  ],
});
