import { defineObject } from 'twenty-sdk/define';

import {
  RESOURCE_CALENDAR_ATTENDANCE_FIELD_UNIVERSAL_IDENTIFIERS as ATTENDANCE_IDS,
  RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  RESOURCE_CALENDAR_LEAVES_FIELD_UNIVERSAL_IDENTIFIERS as LEAVES_IDS,
  RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';
import { activeField, booleanField, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';

// Working hours: the weekly times a team works, which the service levels count in. The time zone is an
// IANA name (the calendar trigger fills an empty one and refuses an unknown one). The average hours per
// day is worked out from the working times and may be typed over until they change.
export default defineObject({
  universalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'resourceCalendar',
  namePlural: 'resourceCalendars',
  labelSingular: 'Working hours',
  labelPlural: 'Working hours',
  description: 'The days and hours a team works in a week, and the time zone they are in',
  icon: 'IconCalendarClock',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    activeField(FIELD_IDS.active),
    textField(FIELD_IDS.tz, 'tz', 'Time zone', 'IconWorld'),
    numberField(FIELD_IDS.hoursPerDay, 'hoursPerDay', 'Average hours per day', 'IconClockHour4', { decimals: 2, defaultValue: 0 }),
    booleanField(FIELD_IDS.twoWeeksCalendar, 'twoWeeksCalendar', 'Two-week schedule', 'IconCalendarRepeat', false),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.attendances,
      name: 'attendances',
      label: 'Working times',
      icon: 'IconClock',
      targetObjectUniversalIdentifier: RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ATTENDANCE_IDS.calendar,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.leaves,
      name: 'leaves',
      label: 'Time off',
      icon: 'IconBeach',
      targetObjectUniversalIdentifier: RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LEAVES_IDS.calendar,
    }),
  ],
});
