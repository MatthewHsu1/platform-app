import { defineIndex } from 'twenty-sdk/define';

import {
  FSM_EQUIPMENT_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.equipment,
    },
    {
      universalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: FIELD_IDS.order,
    },
  ],
});
