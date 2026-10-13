import { describe, expect, it } from 'vitest';

import { planCaseCreate } from 'src/helpdesk/utils/plan-case-create.util';
import { NOW, caseRow, context } from 'src/helpdesk/utils/__tests__/case-fixtures';

describe('planCaseCreate', () => {
  it('assigns the creator and takes the creator first team, its first stage, and stamps the dates', () => {
    const plan = planCaseCreate({ after: caseRow(), creatorMemberId: 'userOwn', context: context(), now: NOW });

    expect(plan.needsNumber).toBe(true);
    expect(plan.data).toEqual({
      assignedUserId: 'userOwn',
      teamId: 'teamA',
      stageId: 'new',
      assignedDate: NOW,
      lastStageUpdate: NOW,
      unattended: true,
    });
  });

  it('leaves a case unassigned when assigning to the creator is turned off', () => {
    const plan = planCaseCreate({
      after: caseRow(),
      creatorMemberId: 'userTeam',
      context: context({ settings: { autoAssign: false, duplicateTracking: false, duplicateStageId: null } }),
      now: NOW,
    });

    expect(plan.data.assignedUserId).toBeUndefined();
    expect(plan.data.teamId).toBeUndefined();
    expect(plan.data.stageId).toBe('new');
  });

  it('does not assign a creator who is not a member of the chosen team', () => {
    const plan = planCaseCreate({ after: caseRow({ teamId: 'teamA' }), creatorMemberId: 'userTeam', context: context(), now: NOW });

    expect(plan.data.assignedUserId).toBeUndefined();
    expect(plan.data.assignedDate).toBeUndefined();
  });

  it('does not assign anyone when the case comes from the API without a signed-in creator', () => {
    const plan = planCaseCreate({ after: caseRow(), creatorMemberId: null, context: context(), now: NOW });

    expect(plan.data.assignedUserId).toBeUndefined();
  });

  it('keeps a given assignee who is not a member of the given team', () => {
    const plan = planCaseCreate({
      after: caseRow({ teamId: 'teamA', assignedUserId: 'userTeam' }),
      creatorMemberId: 'userOwn',
      context: context(),
      now: NOW,
    });

    expect(plan.data.assignedUserId).toBeUndefined();
    expect(plan.data.teamId).toBeUndefined();
    expect(plan.data.assignedDate).toBe(NOW);
  });

  it('takes the team of a given assignee when no team is given', () => {
    const plan = planCaseCreate({ after: caseRow({ assignedUserId: 'user' }), creatorMemberId: null, context: context(), now: NOW });

    expect(plan.data.teamId).toBe('teamA');
    expect(plan.data.stageId).toBe('new');
  });

  it('keeps a given stage, even a closed one, and sets no closed date', () => {
    const plan = planCaseCreate({ after: caseRow({ stageId: 'done' }), creatorMemberId: null, context: context(), now: NOW });

    expect(plan.data.stageId).toBeUndefined();
    expect(plan.data.closedDate).toBeUndefined();
    expect(plan.data.unattended).toBeUndefined();
  });

  it('keeps a given number and a given last stage update', () => {
    const plan = planCaseCreate({
      after: caseRow({ number: 'X-7', lastStageUpdate: '2026-01-01T00:00:00.000Z', stageId: 'new', unattended: true }),
      creatorMemberId: null,
      context: context(),
      now: NOW,
    });

    expect(plan.needsNumber).toBe(false);
    expect(plan.data.lastStageUpdate).toBeUndefined();
  });

  it('numbers a case whose number is empty', () => {
    expect(planCaseCreate({ after: caseRow({ number: '' }), creatorMemberId: null, context: context(), now: NOW }).needsNumber).toBe(true);
    expect(planCaseCreate({ after: caseRow({ number: null }), creatorMemberId: null, context: context(), now: NOW }).needsNumber).toBe(true);
  });

  it('copies the company of the contact', () => {
    expect(planCaseCreate({ after: caseRow({ personId: 'jill' }), creatorMemberId: null, context: context(), now: NOW }).data.companyId).toBe('acme');
    expect(
      planCaseCreate({ after: caseRow({ personId: 'bob', companyId: 'stale' }), creatorMemberId: null, context: context(), now: NOW }).data.companyId,
    ).toBeNull();
  });
});
