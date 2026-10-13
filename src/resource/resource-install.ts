import { DAY_PERIOD, DAY_OF_WEEK, STANDARD_CALENDAR_SEED_KEY } from 'src/resource/resource-options.constant';
import {
  RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

type SeedPeriod = typeof DAY_PERIOD.MORNING | typeof DAY_PERIOD.LUNCH | typeof DAY_PERIOD.AFTERNOON;

const PERIOD_LABEL: Record<SeedPeriod, string> = { MORNING: 'Morning', LUNCH: 'Lunch', AFTERNOON: 'Afternoon' };

const WORKING_DAYS: [string, string][] = [
  [DAY_OF_WEEK.MONDAY, 'Monday'],
  [DAY_OF_WEEK.TUESDAY, 'Tuesday'],
  [DAY_OF_WEEK.WEDNESDAY, 'Wednesday'],
  [DAY_OF_WEEK.THURSDAY, 'Thursday'],
  [DAY_OF_WEEK.FRIDAY, 'Friday'],
];

const line = (day: string, dayName: string, period: SeedPeriod, hourFrom: number, hourTo: number) => ({
  seedKey: `${STANDARD_CALENDAR_SEED_KEY}_${dayName.toLowerCase()}_${period.toLowerCase()}`,
  parentSeedKey: STANDARD_CALENDAR_SEED_KEY,
  parentFieldName: 'calendar',
  parentObjectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
  values: { name: `${dayName} ${PERIOD_LABEL[period]}`, dayofweek: day, hourFrom, hourTo, dayPeriod: period, sequence: 10 },
});

// The standard 40-hour week every team starts on: Monday to Friday, 8 to 12 and 13 to 17 with a lunch
// break between. The time zone is left empty here; the calendar trigger fills it. A working-hours name
// has no required rule: Twenty saves a new row before its name is typed.
export const STANDARD_WORKING_LINES = WORKING_DAYS.flatMap(([day, dayName]) => [
  line(day, dayName, DAY_PERIOD.MORNING, 8, 12),
  line(day, dayName, DAY_PERIOD.LUNCH, 12, 13),
  line(day, dayName, DAY_PERIOD.AFTERNOON, 13, 17),
]);

export const RESOURCE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.5.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [{ seedKey: STANDARD_CALENDAR_SEED_KEY, values: { name: 'Standard 40 hours/week', twoWeeksCalendar: false, active: true, hoursPerDay: 8 } }],
    },
    {
      objectUniversalIdentifier: RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: STANDARD_WORKING_LINES,
    },
  ],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-resource-calendar-attendance-calendar-required',
      expression: 'isDefined(calendar)',
      message: 'A working time belongs to working hours.',
    },
  ],
};
