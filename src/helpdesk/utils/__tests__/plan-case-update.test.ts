import { describe, expect, it } from 'vitest';

import { planCaseUpdate, writtenCaseFields } from 'src/helpdesk/utils/plan-case-update.util';
import { DEFAULT_STAGES, NOW, caseRow, context } from 'src/helpdesk/utils/__tests__/case-fixtures';

const saved = (fields: string[]) => new Set(fields);
const OPEN = caseRow({ teamId: 'teamA', assignedUserId: 'userOwn', stageId: 'new', unattended: true, lastStageUpdate: '2026-10-01T00:00:00.000Z' });

describe('writtenCaseFields', () => {
  it('folds join columns into relation names', () => {
    expect([...writtenCaseFields(['stage', 'stageId', 'assignedUserId', 'name'])].sort()).toEqual(['assignedUser', 'name', 'stage']);
  });
});

describe('planCaseUpdate', () => {
  it('stamps the stage date and the closed date when a staff save moves the case to a closed stage', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, stageId: 'done' }, written: saved(['stage']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan).toEqual({ data: { lastStageUpdate: NOW, closedDate: NOW, unattended: false }, stageSaved: true });
  });

  it('keeps the closed date when a closed case moves back to an open stage', () => {
    const closed = { ...OPEN, stageId: 'done', unattended: false, closedDate: '2026-10-05T00:00:00.000Z' };
    const plan = planCaseUpdate({
      before: closed, after: { ...closed, stageId: 'inProgress' }, written: saved(['stage']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data).toEqual({ lastStageUpdate: NOW });
  });

  it('stamps the assignment date when an assignee is saved, and keeps it when the assignee is removed', () => {
    const assigned = planCaseUpdate({
      before: OPEN, after: { ...OPEN, assignedUserId: 'user' }, written: saved(['assignedUser']), applySaveRules: true, context: context(), now: NOW,
    });
    const removed = planCaseUpdate({
      before: OPEN, after: { ...OPEN, assignedUserId: null, assignedDate: '2026-10-02T00:00:00.000Z' }, written: saved(['assignedUser']),
      applySaveRules: true, context: context(), now: NOW,
    });

    expect(assigned.data).toEqual({ assignedDate: NOW });
    expect(removed.data).toEqual({});
  });

  it('gives a case without a team the first team of its new assignee', () => {
    const noTeam = caseRow({ stageId: 'new', unattended: true });
    const plan = planCaseUpdate({
      before: noTeam, after: { ...noTeam, assignedUserId: 'userTeam' }, written: saved(['assignedUser']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data).toEqual({ assignedDate: NOW, teamId: 'teamB' });
  });

  it('keeps the team when the new assignee is in it', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, assignedUserId: 'user' }, written: saved(['assignedUser']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data.teamId).toBeUndefined();
  });

  it('removes an assignee who is not in the new team', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, teamId: 'teamB' }, written: saved(['team']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data.assignedUserId).toBeNull();
  });

  it('keeps an assignee saved together with the new team', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, teamId: 'teamB', assignedUserId: 'userOwn' }, written: saved(['team', 'assignedUser']),
      applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data.assignedUserId).toBeUndefined();
  });

  it('moves the case to the first stage of the new team without stamping the stage date', () => {
    const stages = DEFAULT_STAGES.map((row) =>
      row.id === 'new' ? { ...row, teamIds: ['teamA'] } : row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row,
    );
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, teamId: 'teamB', assignedUserId: null }, written: saved(['team', 'assignedUser']),
      applySaveRules: true, context: context({ stages }), now: NOW,
    });

    expect(plan).toEqual({ data: { stageId: 'inProgress', unattended: false }, stageSaved: false });
  });

  it('moves a case without a team back to a stage for every team', () => {
    const stages = DEFAULT_STAGES.map((row) => (row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row));
    const inTeamB = caseRow({ teamId: 'teamB', stageId: 'inProgress' });
    const plan = planCaseUpdate({
      before: inTeamB, after: { ...inTeamB, teamId: null }, written: saved(['team']), applySaveRules: true, context: context({ stages }), now: NOW,
    });

    expect(plan.data).toEqual({ stageId: 'new', unattended: true });
  });

  it('checks the stage again when only the assignee changes', () => {
    const stages = DEFAULT_STAGES.map((row) => (row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row));
    const stranded = { ...OPEN, stageId: 'inProgress', unattended: false };
    const plan = planCaseUpdate({
      before: stranded, after: { ...stranded, assignedUserId: 'user' }, written: saved(['assignedUser']),
      applySaveRules: true, context: context({ stages }), now: NOW,
    });

    expect(plan.data).toEqual({ assignedDate: NOW, stageId: 'new', unattended: true });
  });

  it('keeps a stage saved together with a new assignee', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, stageId: 'inProgress', assignedUserId: 'user' }, written: saved(['stage', 'assignedUser']),
      applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data.stageId).toBeUndefined();
    expect(plan.stageSaved).toBe(true);
  });

  it('applies only the copies to a save the app made', () => {
    const plan = planCaseUpdate({
      before: OPEN, after: { ...OPEN, teamId: 'teamB', personId: 'jill', stageId: 'done' }, written: saved(['team', 'person', 'stage']),
      applySaveRules: false, context: context(), now: NOW,
    });

    expect(plan).toEqual({ data: { companyId: 'acme', unattended: false }, stageSaved: false });
  });

  it('empties the company when the contact is removed', () => {
    const withContact = { ...OPEN, personId: 'jill', companyId: 'acme' };
    const plan = planCaseUpdate({
      before: withContact, after: { ...withContact, personId: null }, written: saved(['person']), applySaveRules: true, context: context(), now: NOW,
    });

    expect(plan.data).toEqual({ companyId: null });
  });
});
