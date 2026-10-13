import { describe, expect, it } from 'vitest';

import { planSlaRow } from 'src/helpdesk-sla/utils/plan-sla-row.util';
import { T0, h, policy, roundTheClock, stageSequence } from 'src/helpdesk-sla/utils/__tests__/sla-fixtures';

const make = (extra: Partial<Parameters<typeof planSlaRow>[0]> = {}) =>
  planSlaRow({ policy: policy(), caseStageId: 'new', caseCreatedAt: T0, stageSequence, hoursPerDay: 8, plan: roundTheClock.plan, ...extra });

describe('planSlaRow', () => {
  it('starts in progress from the case creation, due after the policy hours', () => {
    expect(make()).toEqual({
      slaId: 'generic',
      name: 'Generic SLA',
      hours: 2,
      expectedStageId: 'two',
      consumedTime: 0,
      lastStateDate: T0,
      state: 'IN_PROGRESS',
      deadline: h(2),
    });
  });

  it('adds the working days of the policy at the calendar hours per day', () => {
    expect(make({ policy: policy({ days: 1 }) })).toMatchObject({ hours: 10, deadline: h(10) });
  });

  it('starts on hold, with no last state date, in an ignored stage', () => {
    expect(make({ policy: policy({ ignoreStageIds: ['one'] }), caseStageId: 'one' })).toMatchObject({
      state: 'ON_HOLD',
      lastStateDate: null,
      deadline: h(2),
    });
  });

  it('is accomplished at once when the case already passed the target stage', () => {
    expect(make({ policy: policy({ stageId: 'oneOne' }), caseStageId: 'oneTwo' })).toMatchObject({ state: 'ACCOMPLISHED', deadline: h(2) });
  });

  it('is accomplished at once when the policy has no target stage', () => {
    expect(make({ policy: policy({ stageId: null }) }).state).toBe('ACCOMPLISHED');
  });

  it('has no deadline when there is no working time to plan on', () => {
    expect(make({ hoursPerDay: 0, plan: () => null, policy: policy({ days: 1 }) })).toMatchObject({ hours: 2, deadline: null });
  });
});
