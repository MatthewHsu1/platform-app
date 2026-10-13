import { describe, expect, it } from 'vitest';

import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { planSettingsSave } from 'src/crm/settings/utils/plan-settings-save.util';

const STORED: CrmSettingsForm = {
  useLeads: false,
  useRecurringRevenues: false,
  membershipMulti: false,
  autoAssignment: true,
  autoAssignmentAction: 'AUTO',
  intervalNumber: 1,
  intervalType: 'DAYS',
  nextRun: '2026-10-10T08:00:00.000Z',
  plsRebuildCron: false,
  plugPoints: {
    version: 1,
    points: { 'crm.assignment.v1': { enabled: false, target: null, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT' } },
  },
  plugKey: null,
};
const NOW = '2026-10-09T12:00:00.000Z';

describe('planSettingsSave', () => {
  it('refuses a repeat interval of zero or below, and of one hundred or more', () => {
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalNumber: 0 }, now: NOW }).kind).toBe('refuse');
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalNumber: 100 }, now: NOW }).kind).toBe('refuse');
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalNumber: 1.5 }, now: NOW }).kind).toBe('refuse');
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalNumber: 99 }, now: NOW }).kind).toBe('save');
  });

  it('resets the schedule to manual, once a day, when rule-based assignment is off, keeping the next run', () => {
    const plan = planSettingsSave({
      stored: STORED,
      submitted: { ...STORED, autoAssignment: false, intervalNumber: 7, intervalType: 'HOURS', nextRun: null },
      now: NOW,
    });

    expect(plan).toMatchObject({
      kind: 'save',
      variables: {
        CRM_LEAD_AUTO_ASSIGNMENT: false,
        CRM_AUTO_ASSIGNMENT_ACTION: 'MANUAL',
      },
    });
    expect(plan.kind === 'save' && 'CRM_AUTO_ASSIGNMENT_NEXT_RUN' in plan.variables).toBe(false);
    expect(plan.kind === 'save' && 'CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER' in plan.variables).toBe(false);
  });

  it('moves the next run to now plus the new interval when the interval changes', () => {
    const plan = planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalNumber: 2, intervalType: 'HOURS' }, now: NOW });

    expect(plan).toMatchObject({
      kind: 'save',
      variables: {
        CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER: 2,
        CRM_AUTO_ASSIGNMENT_INTERVAL_TYPE: 'HOURS',
        CRM_AUTO_ASSIGNMENT_NEXT_RUN: '2026-10-09T14:00:00.000Z',
      },
    });
  });

  it('keeps a next run the admin typed, even with a new interval', () => {
    const plan = planSettingsSave({
      stored: STORED,
      submitted: { ...STORED, intervalNumber: 3, intervalType: 'WEEKS', nextRun: '2026-11-01T06:00:00.000Z' },
      now: NOW,
    });

    expect(plan).toMatchObject({ kind: 'save', variables: { CRM_AUTO_ASSIGNMENT_NEXT_RUN: '2026-11-01T06:00:00.000Z' } });
  });

  it('writes only what changed and reports the switches with side effects', () => {
    const plan = planSettingsSave({ stored: STORED, submitted: { ...STORED, useLeads: true }, now: NOW });

    expect(plan).toEqual({ kind: 'save', variables: { CRM_USE_LEADS: true }, useLeadsChanged: true, recurringChanged: false });
  });

  it('writes the two switches with side effects last, so a failed save before them leaves them to be saved again', () => {
    const plan = planSettingsSave({
      stored: STORED,
      submitted: { ...STORED, useLeads: true, useRecurringRevenues: true, membershipMulti: true, plsRebuildCron: true, plugKey: 'secret' },
      now: NOW,
    });

    expect(plan.kind === 'save' && Object.keys(plan.variables)).toEqual([
      'SALES_TEAM_MEMBERSHIP_MULTI',
      'CRM_PLS_REBUILD_CRON',
      'PLUG_KEY_CRM_ASSIGNMENT_V1',
      'CRM_USE_LEADS',
      'CRM_USE_RECURRING_REVENUES',
    ]);
  });

  it('writes the plug key only when one is typed, and clears it on an empty one', () => {
    expect(planSettingsSave({ stored: STORED, submitted: STORED, now: NOW })).toMatchObject({ kind: 'save', variables: {} });
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, plugKey: 'secret' }, now: NOW })).toMatchObject({
      variables: { PLUG_KEY_CRM_ASSIGNMENT_V1: 'secret' },
    });
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, plugKey: '' }, now: NOW })).toMatchObject({
      variables: { PLUG_KEY_CRM_ASSIGNMENT_V1: '' },
    });
  });

  it('refuses plug settings that cannot be used', () => {
    const plugPoints = {
      version: 1 as const,
      points: { 'crm.assignment.v1': { ...STORED.plugPoints.points['crm.assignment.v1'], timeoutSeconds: 500 } },
    };

    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, plugPoints }, now: NOW }).kind).toBe('refuse');
  });

  it('refuses a choice outside its list', () => {
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, intervalType: 'YEARS' } as unknown as CrmSettingsForm, now: NOW }).kind).toBe('refuse');
    expect(planSettingsSave({ stored: STORED, submitted: { ...STORED, autoAssignmentAction: 'ALWAYS' } as unknown as CrmSettingsForm, now: NOW }).kind).toBe(
      'refuse',
    );
  });
});
