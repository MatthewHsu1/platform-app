import { describe, expect, it } from 'vitest';

import { makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { leadIdsLabel, makeWriteLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';

const NOW = '2026-10-09T12:00:00.000Z';
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
const STAGES = [stage('new', 1), stage('signed', 50, true)];
// The money values the computes give a lead without amounts.
const ZERO = { amountMicros: 0, currencyCode: 'USD' };
const lead = (id: string, values: Record<string, unknown>): LeadRow =>
  readLeadRow({ id, createdAt: '2026-09-01T09:00:00.000Z', leadType: 'OPPORTUNITY', wonStatus: 'PENDING', dateLastStageUpdate: NOW, ...values });

describe('writeLeadsAsApplication', () => {
  it('applies the save rules itself: 100 % in a won stage closes and wins the lead and counts the move', async () => {
    const store = makeFakeLeadStore({ leads: [lead('l1', { stageId: 'signed', probability: 40 })], stages: STAGES, now: NOW });

    const result = await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'l1', data: { probability: 100, automatedProbability: 100 } }]);

    expect(result).toEqual({ written: ['l1'], skipped: [] });
    expect(store.rows.get('l1')).toMatchObject({ probability: 100, dateClosed: NOW, wonStatus: 'WON' });
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: 1, lost: 0 }]);
  });

  it('leaves the lead trigger nothing to write after its own write', async () => {
    const store = makeFakeLeadStore({ leads: [lead('l1', { stageId: 'new', probability: 40 })], stages: STAGES, now: NOW });

    await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'l1', data: { stageId: 'signed' } }]);
    await makeRunLeadTrigger(store.triggerApi)({ operation: 'updated', events: store.takeAppWriteEvents() });

    expect(store.rows.get('l1')).toMatchObject({ stageId: 'signed', probability: 100, wonStatus: 'WON' });
    expect(store.writes).toEqual([]);
    expect(store.moves).toHaveLength(1);
  });

  it('writes leads that get the same values in one call', async () => {
    const store = makeFakeLeadStore({
      leads: [lead('l1', { stageId: 'signed', probability: 40 }), lead('l2', { stageId: 'signed', probability: 60 })],
      stages: STAGES,
      now: NOW,
    });

    await makeWriteLeadsAsApplication(store.writeApi)([
      { leadId: 'l1', data: { probability: 100, automatedProbability: 100 } },
      { leadId: 'l2', data: { probability: 100, automatedProbability: 100 } },
    ]);

    expect(store.updateCalls).toEqual([['l1', 'l2']]);
  });

  it('skips a guarded write when another writer changed the lead first, counting nothing', async () => {
    const store = makeFakeLeadStore({ leads: [lead('l1', { stageId: 'new', salespersonId: 'someone' })], stages: STAGES, now: NOW });

    const result = await makeWriteLeadsAsApplication(store.writeApi)([
      { leadId: 'l1', data: { salespersonId: 'me' }, guard: { salespersonId: { is: 'NULL' } } },
    ]);

    expect(result).toEqual({ written: [], skipped: ['l1'] });
    expect(store.rows.get('l1')?.salespersonId).toBe('someone');
    expect(store.moves).toEqual([]);
  });

  it('skips a write that would leave a won-stage lead below 100 %', async () => {
    const store = makeFakeLeadStore({
      leads: [lead('l1', { stageId: 'signed', probability: 100, automatedProbability: 100, wonStatus: 'WON' })],
      stages: STAGES,
      now: NOW,
    });

    const result = await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'l1', data: { probability: 30 } }]);

    expect(result).toEqual({ written: [], skipped: ['l1'] });
    expect(store.rows.get('l1')?.probability).toBe(100);
  });

  it('asks for a fresh score without a score to give and leaves a lead won in a stage no longer won as it is', async () => {
    const store = makeFakeLeadStore({
      leads: [
        lead('l1', {
          stageId: 'new',
          probability: 100,
          automatedProbability: 100,
          wonStatus: 'WON',
          dateClosed: '2026-10-01T09:00:00.000Z',
          dayClose: 30,
          proratedRevenue: ZERO,
          recurringRevenueMonthly: ZERO,
          recurringRevenueMonthlyProrated: ZERO,
          recurringRevenueProrated: ZERO,
        }),
      ],
      stages: STAGES,
      now: NOW,
    });

    const result = await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'l1', data: {} }], { rescore: true });

    expect(result).toEqual({ written: ['l1'], skipped: [] });
    expect(store.updateCalls).toEqual([]);
    expect(store.rows.get('l1')).toMatchObject({
      wonStatus: 'WON',
      probability: 100,
      dateClosed: '2026-10-01T09:00:00.000Z',
    });
  });

  it('writes a fresh score on a lead won in a stage no longer won as a probability: it reopens and leaves the won counts', async () => {
    const store = makeFakeLeadStore({
      leads: [
        lead('l1', {
          stageId: 'new',
          probability: 100,
          automatedProbability: 100,
          wonStatus: 'WON',
          dateClosed: '2026-10-01T09:00:00.000Z',
        }),
      ],
      stages: STAGES,
      now: NOW,
      score: () => 25,
    });

    await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'l1', data: {} }], { rescore: true });

    expect(store.rows.get('l1')).toMatchObject({ probability: 25, automatedProbability: 25, wonStatus: 'PENDING', dateClosed: null });
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: -1, lost: 0 }]);
  });

  it('skips a lead that no longer exists', async () => {
    const store = makeFakeLeadStore({ leads: [], stages: STAGES, now: NOW });

    expect(await makeWriteLeadsAsApplication(store.writeApi)([{ leadId: 'gone', data: { name: 'x' } }])).toEqual({
      written: [],
      skipped: ['gone'],
    });
  });

  it('writes guarded leads that get the same values in one request and reports those another writer changed first', async () => {
    const store = makeFakeLeadStore({
      leads: [lead('l1', { stageId: 'new' }), lead('l2', { stageId: 'new', salespersonId: 'someone' }), lead('l3', { stageId: 'new' })],
      stages: STAGES,
      now: NOW,
    });
    const guard = { salespersonId: { is: 'NULL' } };

    const result = await makeWriteLeadsAsApplication(store.writeApi)(
      ['l1', 'l2', 'l3'].map((leadId) => ({ leadId, data: { salespersonId: 'me' }, guard })),
    );

    expect(result).toEqual({ written: ['l1', 'l3'], skipped: ['l2'] });
    expect(store.guardedCalls).toEqual([['l1', 'l2', 'l3']]);
    expect(store.rows.get('l2')?.salespersonId).toBe('someone');
  });
});

describe('leadIdsLabel', () => {
  it('names up to five leads and counts the rest', () => {
    expect(leadIdsLabel(['a', 'b'])).toBe('a, b');
    expect(leadIdsLabel(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe('a, b, c, d, e and 2 more');
  });
});
