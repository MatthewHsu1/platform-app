import { defineField } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import {
  FIELDSERVICE_ACTIVITY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.fsmOrderOrderActivities,
    name: 'orderActivities',
    label: 'Activities',
    icon: 'IconChecklist',
    targetObjectUniversalIdentifier: FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.fsmOrder,
  }),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
