import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  DAY_OF_WEEK,
  DAY_OF_WEEK_OPTIONS,
  DAY_PERIOD,
  DAY_PERIOD_OPTIONS,
  WEEK_TYPE_OPTIONS,
} from 'src/resource/resource-options.constant';
import {
  RESOURCE_CALENDAR_ATTENDANCE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_FIELD_UNIVERSAL_IDENTIFIERS as CALENDAR_IDS,
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';
import { manyToOneField, numberField, seedKeyField, selectField, textField } from 'src/shared/fields';

// One working period of one weekday. A break line separates the morning from the afternoon and is not
// worked. In a two-week schedule the week says which week the line is in; a line without a week counts as
// the first week.
export default defineObject({
  universalIdentifier: RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'resourceCalendarAttendance',
  namePlural: 'resourceCalendarAttendances',
  labelSingular: 'Working time',
  labelPlural: 'Working times',
  description: 'The hours worked on one weekday',
  icon: 'IconClock',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    selectField(FIELD_IDS.dayofweek, 'dayofweek', 'Day of week', 'IconCalendarWeek', DAY_OF_WEEK.MONDAY, DAY_OF_WEEK_OPTIONS),
    numberField(FIELD_IDS.hourFrom, 'hourFrom', 'From (hour)', 'IconClockPlay', { decimals: 2, defaultValue: 0 }),
    numberField(FIELD_IDS.hourTo, 'hourTo', 'To (hour)', 'IconClockStop', { decimals: 2, defaultValue: 0 }),
    selectField(FIELD_IDS.dayPeriod, 'dayPeriod', 'Day period', 'IconSun', DAY_PERIOD.MORNING, DAY_PERIOD_OPTIONS),
    {
      universalIdentifier: FIELD_IDS.weekType,
      name: 'weekType',
      label: 'Week',
      icon: 'IconCalendarWeek',
      type: FieldType.SELECT,
      options: WEEK_TYPE_OPTIONS.map((option, position) => ({ ...option, position })),
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.calendar,
      name: 'calendar',
      label: 'Working hours',
      icon: 'IconCalendarClock',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CALENDAR_IDS.attendances,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
