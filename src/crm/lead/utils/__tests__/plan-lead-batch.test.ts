import { describe, expect, it } from 'vitest';

import { leadSelectionFields, readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadEvent } from 'src/crm/lead/types/lead-event.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { planLeadBatch } from 'src/crm/lead/utils/plan-lead-batch.util';

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
  stages: [stage('new', 1), stage('won', 70, true)],
  recurringPlanMonths: new Map(),
  teams: [],
  memberships: [],
  people: new Map(),
  companies: new Map(),
};
const READ = leadSelectionFields({ withTeam: false });
// The money values the computes give a lead without amounts, so a test row is
// already up to date apart from what the test changes.
const ZERO = { amountMicros: 0, currencyCode: 'USD' };
const lead = (values: Record<string, unknown>): LeadRow =>
  readLeadRow({
    id: 'l1',
    createdAt: '2026-09-01T09:00:00.000Z',
    leadType: 'OPPORTUNITY',
    wonStatus: 'PENDING',
    dateLastStageUpdate: D,
    proratedRevenue: ZERO,
    recurringRevenueMonthly: ZERO,
    recurringRevenueMonthlyProrated: ZERO,
    recurringRevenueProrated: ZERO,
    ...values,
  });
const staffSave = (before: LeadRow, written: Record<string, unknown>): LeadEvent => ({
  before,
  after: { ...before, ...written } as LeadRow,
  written: new Set(Object.keys(written)),
  appWrite: false,
  creatorMemberId: null,
});

describe('planLeadBatch', () => {
  it('ends two saves of one lead in one batch as the two saves in order', () => {
    const start = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const first = staffSave(start, { stageId: 'won' });
    const second = staffSave(first.after, { stageId: 'new' });
    const plan = planLeadBatch({ operation: 'updated', events: [first, second], current: second.after, now: NOW, context: CONTEXT, readFields: READ });

    expect(plan).toMatchObject({
      kind: 'write',
      data: { probability: 100, automatedProbability: 100, dateLastStageUpdate: NOW },
      statusMoves: { won: 0, lost: 0 },
    });
    expect(plan.kind === 'write' && { ...second.after, ...plan.data }).toMatchObject({
      stageId: 'new',
      dateClosed: null,
      wonStatus: 'PENDING',
    });
  });

  it('lets an automatic probability follow the score after two saves that leave the won stage again', () => {
    const start = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const first = staffSave(start, { stageId: 'won' });
    const second = staffSave(first.after, { stageId: 'new' });
    const plan = planLeadBatch({
      operation: 'updated',
      events: [first, second],
      current: second.after,
      now: NOW,
      context: { ...CONTEXT, score: () => 25 },
      readFields: READ,
    });

    expect(plan).toMatchObject({ kind: 'write', data: { probability: 25, automatedProbability: 25 }, statusMoves: { won: 0, lost: 0 } });
    expect(plan.kind === 'write' && { ...second.after, ...plan.data }).toMatchObject({ dateClosed: null, wonStatus: 'PENDING' });
  });

  it('gives a save a newer save has overtaken only the computes', () => {
    const start = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const overtaken = staffSave(start, { stageId: 'won' });
    const plan = planLeadBatch({ operation: 'updated', events: [overtaken], current: start, now: NOW, context: CONTEXT, readFields: READ });

    expect(plan).toEqual({ kind: 'write', data: {}, statusMoves: { won: 0, lost: 0 }, personPush: null });
  });

  it('applies the save rules to a save the stored row still matches', () => {
    const start = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const save = staffSave(start, { stageId: 'won' });
    const plan = planLeadBatch({
      operation: 'updated',
      events: [save],
      current: { ...save.after, name: 'renamed since' },
      now: NOW,
      context: CONTEXT,
      readFields: READ,
    });

    expect(plan).toMatchObject({
      kind: 'write',
      data: { probability: 100, dateClosed: NOW, wonStatus: 'WON' },
      statusMoves: { won: 1, lost: 0 },
    });
  });
});
