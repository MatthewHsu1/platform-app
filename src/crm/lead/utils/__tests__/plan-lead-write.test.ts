import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type LeadWritePlan } from 'src/crm/lead/types/lead-write-plan.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { planLeadWrite } from 'src/crm/lead/utils/plan-lead-write.util';

const NOW = '2026-10-09T12:00:00.000Z';
const D = '2026-10-01T09:00:00.000Z';
const stage = (id: string, sequence: number, isWon = false): StageRow => ({
  id,
  name: id,
  sequence,
  isWon,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  teamIds: [],
});
const CONTEXT: LeadContext = {
  stages: [stage('new', 1), stage('qualified', 2), stage('wonA', 70, true), stage('wonB', 80, true)],
  recurringPlanMonths: new Map(),
  teams: [],
  memberships: [],
  people: new Map(),
  companies: new Map(),
};
const lead = (values: Record<string, unknown>): LeadRow =>
  readLeadRow({
    id: 'l1',
    createdAt: '2026-09-01T09:00:00.000Z',
    leadType: 'OPPORTUNITY',
    wonStatus: 'PENDING',
    dateLastStageUpdate: D,
    ...values,
  });

const update = (before: LeadRow, written: Record<string, unknown>) =>
  planLeadWrite({
    operation: 'updated',
    before,
    after: { ...before, ...written } as LeadRow,
    written: new Set(Object.keys(written)),
    applySaveRules: true,
    now: NOW,
    context: CONTEXT,
    creatorMemberId: null,
  });

const result = (row: LeadRow, plan: LeadWritePlan) => {
  if (plan.kind !== 'write') {
    throw new Error(`expected a write, got ${plan.reason}`);
  }
  return { ...row, ...plan.data } as LeadRow;
};

describe('closed date and status on a save', () => {
  it('a drag of a 40 % lead into the won stage wins it and stamps the closed date', () => {
    const before = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const plan = update(before, { stageId: 'wonA' });

    expect(result({ ...before, stageId: 'wonA' }, plan)).toMatchObject({
      probability: 100,
      automatedProbability: 100,
      dateClosed: NOW,
      dateLastStageUpdate: NOW,
      wonStatus: 'WON',
    });
    expect(plan.kind === 'write' && plan.statusMoves).toEqual({ won: 1, lost: 0 });
  });

  it('keeps the closed date when a won lead moves to another won stage', () => {
    const before = lead({ stageId: 'wonA', probability: 100, automatedProbability: 100, wonStatus: 'WON', dateClosed: D });

    expect(result({ ...before, stageId: 'wonB' }, update(before, { stageId: 'wonB' })).dateClosed).toBe(D);
  });

  it('clears the closed date when a won lead goes back to an open stage; without a score the probability stays', () => {
    const before = lead({ stageId: 'wonA', probability: 100, automatedProbability: 100, wonStatus: 'WON', dateClosed: D });
    const plan = update(before, { stageId: 'new' });

    expect(result({ ...before, stageId: 'new' }, plan)).toMatchObject({ dateClosed: null, wonStatus: 'PENDING', probability: 100 });
    expect(plan.kind === 'write' && plan.statusMoves).toEqual({ won: -1, lost: 0 });
  });

  it('marking a lead lost stamps the closed date', () => {
    const before = lead({ stageId: 'new', probability: 40 });
    const plan = update(before, { wonStatus: 'LOST', probability: 0 });

    expect(result({ ...before, wonStatus: 'LOST', probability: 0 }, plan)).toMatchObject({ dateClosed: NOW, wonStatus: 'LOST' });
    expect(plan.kind === 'write' && plan.statusMoves).toEqual({ won: 0, lost: 1 });
  });

  it('restoring a lost lead with an automated probability above 0 clears the closed date', () => {
    const before = lead({ stageId: 'new', probability: 0, automatedProbability: 30, wonStatus: 'LOST', dateClosed: D });
    const written = { wonStatus: 'PENDING', lostReasonId: null, probability: 30 };

    expect(result({ ...before, ...written } as LeadRow, update(before, written))).toMatchObject({
      dateClosed: null,
      wonStatus: 'PENDING',
      probability: 30,
    });
  });

  it('restoring a lost lead whose automated probability is 0 keeps the closed date', () => {
    const before = lead({ stageId: 'new', probability: 0, automatedProbability: 0, wonStatus: 'LOST', dateClosed: D });
    const written = { wonStatus: 'PENDING', lostReasonId: null, probability: 0 };

    expect(result({ ...before, ...written } as LeadRow, update(before, written))).toMatchObject({ dateClosed: D, wonStatus: 'PENDING' });
  });

  it('setting the probability to 0 keeps the closed date', () => {
    const before = lead({ stageId: 'new', probability: 40, dateClosed: D });

    expect(result({ ...before, probability: 0 }, update(before, { probability: 0 })).dateClosed).toBe(D);
  });

  it('100 % in a stage that is not won stamps the closed date but stays pending', () => {
    const before = lead({ stageId: 'qualified', probability: 40 });

    expect(result({ ...before, probability: 100 }, update(before, { probability: 100 }))).toMatchObject({
      dateClosed: NOW,
      wonStatus: 'PENDING',
    });
  });

  it('a stage change with a probability above 0 clears the closed date', () => {
    const before = lead({ stageId: 'new', probability: 40, dateClosed: D });
    const written = { stageId: 'qualified', probability: 50 };

    expect(result({ ...before, ...written } as LeadRow, update(before, written)).dateClosed).toBeNull();
  });
});

describe('creating a lead', () => {
  const create = (after: LeadRow, creatorMemberId: string | null = null) =>
    planLeadWrite({
      operation: 'created',
      before: null,
      after,
      written: new Set(
        Object.entries(after)
          .filter(([, value]) => value !== null)
          .map(([key]) => key),
      ),
      applySaveRules: true,
      now: NOW,
      context: CONTEXT,
      creatorMemberId,
    });

  it('a lead created in a won stage is won at 100 % with the closed date set', () => {
    const after = lead({ stageId: 'wonA', dateLastStageUpdate: null, wonStatus: 'PENDING' });
    const plan = create(after);

    expect(result(after, plan)).toMatchObject({ probability: 100, automatedProbability: 100, dateClosed: NOW, wonStatus: 'WON' });
    expect(plan.kind === 'write' && plan.statusMoves).toEqual({ won: 1, lost: 0 });
  });

  it('gives a lead created without a stage the first open stage and the stage date', () => {
    const after = lead({ stageId: null, dateLastStageUpdate: null });

    expect(result(after, create(after))).toMatchObject({ stageId: 'new', dateLastStageUpdate: NOW });
  });

  it('makes the person who created the lead its salesperson, with the assignment date', () => {
    const after = lead({ stageId: 'new', createdAt: NOW });

    expect(result(after, create(after, 'member-1'))).toMatchObject({ salespersonId: 'member-1', dateOpen: NOW, dayOpen: 0 });
  });

  it('leaves the salesperson empty when no person created the lead', () => {
    const after = lead({ stageId: 'new' });

    expect(result(after, create(after, null)).salespersonId).toBeNull();
  });

  it('destroys a lead created in a won stage below 100 %', () => {
    const after = lead({ stageId: 'wonA', probability: 40 });

    expect(create(after)).toEqual({ kind: 'refuse', reason: expect.any(String), undo: { kind: 'destroy' } });
  });
});

describe('other save rules', () => {
  it('puts back a probability below 100 % typed on a won lead', () => {
    const before = lead({ stageId: 'wonA', probability: 100, automatedProbability: 100, wonStatus: 'WON', dateClosed: D });

    expect(update(before, { probability: 50 })).toEqual({
      kind: 'refuse',
      reason: expect.any(String),
      undo: { kind: 'putBack', data: { probability: 100 }, statusMoves: { won: 0, lost: 0 } },
    });
  });

  it('stamps the assignment date when the salesperson changes and clears it when the salesperson is removed', () => {
    const before = lead({ stageId: 'new', salespersonId: 'a', dateOpen: D });

    expect(result({ ...before, salespersonId: 'b' }, update(before, { salespersonId: 'b' })).dateOpen).toBe(NOW);
    expect(result({ ...before, salespersonId: null }, update(before, { salespersonId: null })).dateOpen).toBeNull();
  });

  it('wins back a lost lead dragged into the won stage, keeping its lost reason', () => {
    const before = lead({ stageId: 'new', probability: 0, wonStatus: 'LOST', lostReasonId: 'r1' });

    expect(result({ ...before, stageId: 'wonA' }, update(before, { stageId: 'wonA' }))).toMatchObject({
      wonStatus: 'WON',
      lostReasonId: 'r1',
      probability: 100,
    });
  });

  it('counts no status move for a save that touches neither stage, probability nor status', () => {
    const before = lead({ stageId: 'wonA', probability: 100, automatedProbability: 100, wonStatus: 'WON' });
    const plan = update(before, { name: 'Renamed' });

    expect(plan.kind === 'write' && plan.statusMoves).toEqual({ won: 0, lost: 0 });
  });

  it('applies only the computes to a write the app made itself', () => {
    const before = lead({ stageId: 'new', probability: 40 });
    const after = { ...before, stageId: 'wonA' };
    const plan = planLeadWrite({
      operation: 'updated',
      before,
      after,
      written: new Set(['stageId']),
      applySaveRules: false,
      now: NOW,
      context: CONTEXT,
      creatorMemberId: null,
    });

    expect(result(after, plan)).toMatchObject({ dateLastStageUpdate: D, dateClosed: null, wonStatus: 'PENDING' });
  });
});
