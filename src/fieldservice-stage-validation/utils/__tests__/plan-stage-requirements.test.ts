import { describe, expect, it } from 'vitest';

import { planStageRequirements } from 'src/fieldservice-stage-validation/utils/plan-stage-requirements.util';

const rule = (stage: string | null, requiredFields: string[] | null) => ({ stage, requiredFields });

describe('planStageRequirements', () => {
  it('stops a move into a stage whose required description is empty', () => {
    const rules = [rule('COMPLETED', ['DESCRIPTION'])];

    expect(planStageRequirements({ stage: 'COMPLETED', rules, values: { description: { markdown: null } } })).toEqual({
      kind: 'missing',
      stageName: 'Completed',
      fieldLabel: 'Description',
    });
  });

  it('lets the move through once the field is set', () => {
    const rules = [rule('COMPLETED', ['DESCRIPTION'])];

    expect(planStageRequirements({ stage: 'COMPLETED', rules, values: { description: { markdown: 'Complete the work order' } } })).toEqual({
      kind: 'ok',
    });
  });

  it('lets a move through a stage nobody listed fields for', () => {
    const rules = [rule('COMPLETED', ['DESCRIPTION'])];

    expect(planStageRequirements({ stage: 'CANCELLED', rules, values: {} })).toEqual({ kind: 'ok' });
    expect(planStageRequirements({ stage: 'COMPLETED', rules: [], values: {} })).toEqual({ kind: 'ok' });
  });

  it('adds up several rows of one stage and reports the first empty field in the list order', () => {
    const rules = [rule('COMPLETED', ['RESOLUTION']), rule('COMPLETED', ['LOCATION', 'TEAM']), rule('NEW', ['PERSON'])];

    expect(planStageRequirements({ stage: 'COMPLETED', rules, values: { teamId: null, locationId: null, resolution: { markdown: '' } } })).toEqual({
      kind: 'missing',
      stageName: 'Completed',
      fieldLabel: 'Team',
    });
    expect(planStageRequirements({ stage: 'COMPLETED', rules, values: { teamId: 't1', locationId: 'l1', resolution: { markdown: '' } } })).toEqual({
      kind: 'missing',
      stageName: 'Completed',
      fieldLabel: 'Resolution',
    });
  });

  it('reads a relation by its id, zero hours as empty, and a start time as set', () => {
    const rules = [rule('SCHEDULED', ['PERSON', 'SCHEDULED_DURATION', 'SCHEDULED_DATE_START'])];

    expect(planStageRequirements({ stage: 'SCHEDULED', rules, values: { personId: 'p1', scheduledDuration: 0, scheduledDateStart: '2026-10-14T08:00:00.000Z' } })).toEqual({
      kind: 'missing',
      stageName: 'Scheduled',
      fieldLabel: 'Scheduled duration (hours)',
    });
    expect(planStageRequirements({ stage: 'SCHEDULED', rules, values: { personId: 'p1', scheduledDuration: 2, scheduledDateStart: '2026-10-14T08:00:00.000Z' } })).toEqual({
      kind: 'ok',
    });
  });

  it('ignores a rule row without a stage, a row without fields and an option that is no longer listed', () => {
    const rules = [rule(null, ['TEAM']), rule('COMPLETED', null), rule('COMPLETED', ['NO_SUCH_FIELD'])];

    expect(planStageRequirements({ stage: 'COMPLETED', rules, values: {} })).toEqual({ kind: 'ok' });
    expect(planStageRequirements({ stage: null, rules, values: {} })).toEqual({ kind: 'ok' });
  });
});
