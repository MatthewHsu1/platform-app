import { type CrmSettings } from 'src/crm/settings/types/crm-settings.type';
import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';

const KEYS = [
  'SALES_TEAM_MEMBERSHIP_MULTI',
  'CRM_LEAD_AUTO_ASSIGNMENT',
  'CRM_AUTO_ASSIGNMENT_ACTION',
  'CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER',
  'CRM_AUTO_ASSIGNMENT_INTERVAL_TYPE',
  'CRM_AUTO_ASSIGNMENT_NEXT_RUN',
  'CRM_ASSIGNMENT_DELAY_HOURS',
] as const;

type Values = Partial<Record<(typeof KEYS)[number], string>>;

// App variables arrive as text; an empty value takes the default.
const filled = (text: string | undefined) => (text === undefined || text === '' ? undefined : text);

const asBoolean = (text: string | undefined, fallback: boolean) => (filled(text) === undefined ? fallback : text === 'true');

const asNumber = (text: string | undefined, fallback: number) => {
  const value = Number.parseFloat(filled(text) ?? '');

  return Number.isFinite(value) ? value : fallback;
};

const asChoice = <TChoice extends string>(text: string | undefined, choices: readonly TChoice[], fallback: TChoice) =>
  choices.find((choice) => choice === text) ?? fallback;

const asDate = (text: string | undefined) => {
  const value = filled(text);

  return value === undefined || Number.isNaN(Date.parse(value)) ? null : value;
};

export const readCrmSettings = async (): Promise<CrmSettings> => {
  const values: Values = Object.fromEntries(await Promise.all(KEYS.map(async (key) => [key, await readApplicationVariable(key)])));

  return {
    membershipMulti: asBoolean(values.SALES_TEAM_MEMBERSHIP_MULTI, false),
    autoAssignment: asBoolean(values.CRM_LEAD_AUTO_ASSIGNMENT, false),
    autoAssignmentAction: asChoice(values.CRM_AUTO_ASSIGNMENT_ACTION, ['MANUAL', 'AUTO'] as const, 'MANUAL'),
    intervalNumber: asNumber(values.CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER, 1),
    intervalType: asChoice(values.CRM_AUTO_ASSIGNMENT_INTERVAL_TYPE, ['MINUTES', 'HOURS', 'DAYS', 'WEEKS'] as const, 'DAYS'),
    nextRun: asDate(values.CRM_AUTO_ASSIGNMENT_NEXT_RUN),
    assignmentDelayHours: asNumber(values.CRM_ASSIGNMENT_DELAY_HOURS, 0),
  };
};
