import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { LEAVE_TIME_TYPE, LEAVE_TIME_TYPE_OPTIONS } from 'src/resource/resource-options.constant';
import {
  RESOURCE_CALENDAR_FIELD_UNIVERSAL_IDENTIFIERS as CALENDAR_IDS,
  RESOURCE_CALENDAR_LEAVES_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';
import { manyToOneField, selectField, textField } from 'src/shared/fields';

// Time the company is closed. A time off with no working hours counts for every working-hours record. The
// start and end have no required rule: the leaves trigger fills an empty end.
export default defineObject({
  universalIdentifier: RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'resourceCalendarLeave',
  namePlural: 'resourceCalendarLeaves',
  labelSingular: 'Time off',
  labelPlural: 'Time off',
  description: 'A period when nobody works',
  icon: 'IconBeach',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Reason', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.calendar,
      name: 'calendar',
      label: 'Working hours',
      icon: 'IconCalendarClock',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CALENDAR_IDS.leaves,
    }),
    { universalIdentifier: FIELD_IDS.dateFrom, name: 'dateFrom', label: 'Start', icon: 'IconCalendarPlus', type: FieldType.DATE_TIME },
    { universalIdentifier: FIELD_IDS.dateTo, name: 'dateTo', label: 'End', icon: 'IconCalendarMinus', type: FieldType.DATE_TIME },
    selectField(FIELD_IDS.timeType, 'timeType', 'Kind', 'IconCategory', LEAVE_TIME_TYPE.LEAVE, LEAVE_TIME_TYPE_OPTIONS),
  ],
});
