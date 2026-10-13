import { type SelectFieldOption } from 'src/shared/fields';

export const DAY_OF_WEEK = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

// Monday is 0, as the weekday counts in the working-time rules.
export const DAY_OF_WEEK_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

export const DAY_OF_WEEK_OPTIONS: SelectFieldOption[] = [
  { value: DAY_OF_WEEK.MONDAY, label: 'Monday', color: 'blue' },
  { value: DAY_OF_WEEK.TUESDAY, label: 'Tuesday', color: 'blue' },
  { value: DAY_OF_WEEK.WEDNESDAY, label: 'Wednesday', color: 'blue' },
  { value: DAY_OF_WEEK.THURSDAY, label: 'Thursday', color: 'blue' },
  { value: DAY_OF_WEEK.FRIDAY, label: 'Friday', color: 'blue' },
  { value: DAY_OF_WEEK.SATURDAY, label: 'Saturday', color: 'gray' },
  { value: DAY_OF_WEEK.SUNDAY, label: 'Sunday', color: 'gray' },
];

export const DAY_PERIOD = { MORNING: 'MORNING', LUNCH: 'LUNCH', AFTERNOON: 'AFTERNOON', FULL_DAY: 'FULL_DAY' } as const;

export const DAY_PERIOD_OPTIONS: SelectFieldOption[] = [
  { value: DAY_PERIOD.MORNING, label: 'Morning', color: 'yellow' },
  { value: DAY_PERIOD.LUNCH, label: 'Break', color: 'gray' },
  { value: DAY_PERIOD.AFTERNOON, label: 'Afternoon', color: 'orange' },
  { value: DAY_PERIOD.FULL_DAY, label: 'Full day', color: 'blue' },
];

export const WEEK_TYPE = { FIRST: 'FIRST', SECOND: 'SECOND' } as const;

export const WEEK_TYPE_OPTIONS: SelectFieldOption[] = [
  { value: WEEK_TYPE.FIRST, label: 'First week', color: 'blue' },
  { value: WEEK_TYPE.SECOND, label: 'Second week', color: 'purple' },
];

export const LEAVE_TIME_TYPE = { LEAVE: 'LEAVE', OTHER: 'OTHER' } as const;

export const LEAVE_TIME_TYPE_OPTIONS: SelectFieldOption[] = [
  { value: LEAVE_TIME_TYPE.LEAVE, label: 'Time off', color: 'red' },
  { value: LEAVE_TIME_TYPE.OTHER, label: 'Other', color: 'gray' },
];

// Rows the install step makes once; code finds them by key after staff rename them.
export const STANDARD_CALENDAR_SEED_KEY = 'resource.resource_calendar_std';
