import { CRM_SETTINGS_MESSAGES } from 'src/crm/settings/crm-settings-messages.constant';
import { CRM_SETTINGS_VARIABLE_KEYS } from 'src/crm/settings/crm-settings-variable-keys.constant';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { type SettingsRefusal } from 'src/crm/settings/types/settings-refusal.type';
import { validatePlugPointsInput } from 'src/crm/settings/utils/validate-plug-points-input.util';

const INTERVAL_MS: Record<CrmSettingsForm['intervalType'], number> = {
  MINUTES: 60_000,
  HOURS: 3_600_000,
  DAYS: 86_400_000,
  WEEKS: 604_800_000,
};
const ACTIONS: CrmSettingsForm['autoAssignmentAction'][] = ['MANUAL', 'AUTO'];
const SWITCHES = ['useLeads', 'useRecurringRevenues', 'membershipMulti', 'autoAssignment', 'plsRebuildCron'] as const;
// Their side effects run only when they differ from what is stored, so they
// are saved last: if an earlier write fails, the next save still sees them changed.
const WRITTEN_LAST: (keyof CrmSettingsForm)[] = ['useLeads', 'useRecurringRevenues'];
const FIELDS = (Object.keys(CRM_SETTINGS_VARIABLE_KEYS) as (keyof CrmSettingsForm)[]).sort(
  (left, right) => Number(WRITTEN_LAST.includes(left)) - Number(WRITTEN_LAST.includes(right)),
);

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const isInstant = (value: unknown) => value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));

const hasExpectedForm = (form: CrmSettingsForm) =>
  SWITCHES.every((key) => typeof form[key] === 'boolean') &&
  ACTIONS.includes(form.autoAssignmentAction) &&
  Object.keys(INTERVAL_MS).includes(form.intervalType) &&
  typeof form.intervalNumber === 'number' &&
  isInstant(form.nextRun) &&
  (form.plugKey === null || typeof form.plugKey === 'string');

// The variables a save of the settings page writes: only what changed, with
// the schedule rules applied, and which switches need their side effects.
export const planSettingsSave = ({
  stored,
  submitted,
  now,
}: {
  stored: CrmSettingsForm;
  submitted: CrmSettingsForm;
  now: string;
}): SettingsRefusal | { kind: 'save'; variables: Record<string, unknown>; useLeadsChanged: boolean; recurringChanged: boolean } => {
  if (!hasExpectedForm(submitted)) {
    return { kind: 'refuse', reason: CRM_SETTINGS_MESSAGES.badForm, values: {} };
  }
  const plugPoints = validatePlugPointsInput(submitted.plugPoints);

  if (plugPoints.kind === 'invalid') {
    return { kind: 'refuse', reason: plugPoints.reason, values: plugPoints.values };
  }
  const next: CrmSettingsForm = { ...submitted, plugPoints: plugPoints.value };

  if (!submitted.autoAssignment) {
    // Turned off, the schedule goes back to manual, once a day; its next run
    // is kept for when it is turned on again.
    next.autoAssignmentAction = 'MANUAL';
    next.intervalNumber = 1;
    next.intervalType = 'DAYS';
    next.nextRun = stored.nextRun;
  } else {
    if (!Number.isInteger(submitted.intervalNumber) || submitted.intervalNumber <= 0) {
      return { kind: 'refuse', reason: CRM_SETTINGS_MESSAGES.intervalNotPositive, values: {} };
    }
    if (submitted.intervalNumber >= 100) {
      return { kind: 'refuse', reason: CRM_SETTINGS_MESSAGES.intervalTooLarge, values: {} };
    }
    const intervalChanged = submitted.intervalNumber !== stored.intervalNumber || submitted.intervalType !== stored.intervalType;
    const nextRunTyped = submitted.nextRun !== null && submitted.nextRun !== stored.nextRun;

    if (intervalChanged && !nextRunTyped) {
      next.nextRun = new Date(Date.parse(now) + submitted.intervalNumber * INTERVAL_MS[submitted.intervalType]).toISOString();
    } else if (submitted.nextRun === null) {
      next.nextRun = stored.nextRun;
    }
  }
  const variables: Record<string, unknown> = {};

  for (const field of FIELDS) {
    if (field === 'plugKey') {
      if (next.plugKey !== null) {
        variables[CRM_SETTINGS_VARIABLE_KEYS.plugKey] = next.plugKey;
      }
      continue;
    }
    if (!sameValue(next[field], stored[field])) {
      variables[CRM_SETTINGS_VARIABLE_KEYS[field]] = next[field];
    }
  }

  return {
    kind: 'save',
    variables,
    useLeadsChanged: next.useLeads !== stored.useLeads,
    recurringChanged: next.useRecurringRevenues !== stored.useRecurringRevenues,
  };
};
