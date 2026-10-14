import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  FIELDSERVICE_ACTIVITY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.workspaceMemberFsmActivities,
    name: 'completedFsmActivities',
    label: 'Completed service activities',
    icon: 'IconUserCheck',
    targetObjectUniversalIdentifier: FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.completedBy,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
