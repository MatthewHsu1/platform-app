import { defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/resource/resource-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.resourceCalendarFsmLocations,
    name: 'fsmLocations',
    label: 'Service locations',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.calendar,
  }),
  objectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
});
