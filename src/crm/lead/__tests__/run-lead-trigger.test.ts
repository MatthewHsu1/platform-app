import { describe, expect, it } from 'vitest';

import { leadEvent, makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { WON_STAGE_REFUSAL_MESSAGE } from 'src/crm/lead/utils/won-stage-refusal.util';

const NOW = '2026-10-09T12:00:00.000Z';
const D = '2026-10-01T09:00:00.000Z';
const STAFF = { source: 'MANUAL', workspaceMemberId: 'm1' };
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
const STAGES = [stage('new', 1), stage('won', 70, true)];
const ZERO = { amountMicros: 0, currencyCode: 'USD' };
const lead = (id: string, values: Record<string, unknown>): LeadRow =>
  readLeadRow({
    id,
    createdAt: '2026-09-01T09:00:00.000Z',
    leadType: 'OPPORTUNITY',
    wonStatus: 'PENDING',
    dateLastStageUpdate: D,
    updatedBy: STAFF,
    proratedRevenue: ZERO,
    recurringRevenueMonthly: ZERO,
    recurringRevenueMonthlyProrated: ZERO,
    recurringRevenueProrated: ZERO,
    ...values,
  });
const updateEvent = (before: unknown, after: LeadRow, updatedFields: string[], raw: unknown = after) =>
  leadEvent({ recordId: after.id, workspaceMemberId: 'm1', properties: { before, after: raw, updatedFields } });

describe('lead trigger', () => {
  it('wins a lead dragged into the won stage, and its pass over its own write writes nothing', async () => {
    const before = lead('l1', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const after = { ...before, stageId: 'won' };
    const store = makeFakeLeadStore({ leads: [after], stages: STAGES, now: NOW });
    const run = makeRunLeadTrigger(store.triggerApi);

    await run({ operation: 'updated', events: [updateEvent(before, after, ['stage', 'stageId'])] });

    expect(store.rows.get('l1')).toMatchObject({ probability: 100, automatedProbability: 100, dateClosed: NOW, wonStatus: 'WON' });
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: 1, lost: 0 }]);

    await run({ operation: 'updated', events: store.takeAppWriteEvents() });

    expect(store.writes).toEqual([]);
    expect(store.moves).toHaveLength(1);
  });

  it('ends two saves of one lead in one batch as the two saves in order', async () => {
    const start = lead('l1', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const wonSave = { ...start, stageId: 'won' };
    const backSave = { ...wonSave, stageId: 'new' };
    const store = makeFakeLeadStore({ leads: [backSave], stages: STAGES, now: NOW });

    await makeRunLeadTrigger(store.triggerApi)({
      operation: 'updated',
      events: [updateEvent(start, wonSave, ['stageId']), updateEvent(wonSave, backSave, ['stageId'])],
    });

    expect(store.rows.get('l1')).toMatchObject({ stageId: 'new', probability: 100, dateClosed: null, wonStatus: 'PENDING' });
    expect(store.moves).toEqual([]);
  });

  it('keeps the drag into the won stage when a probability below 100 % saved after it in the same batch is refused', async () => {
    const start = lead('l1', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const wonSave = { ...start, stageId: 'won' };
    const probabilitySave = { ...wonSave, probability: 50 };
    const store = makeFakeLeadStore({ leads: [probabilitySave], stages: STAGES, now: NOW });
    const run = makeRunLeadTrigger(store.triggerApi);

    await run({
      operation: 'updated',
      events: [updateEvent(start, wonSave, ['stage', 'stageId']), updateEvent(wonSave, probabilitySave, ['probability'])],
    });

    expect(store.rows.get('l1')).toMatchObject({
      stageId: 'won',
      probability: 100,
      automatedProbability: 100,
      wonStatus: 'WON',
      dateClosed: NOW,
      dateLastStageUpdate: NOW,
    });
    expect(store.notes).toEqual([{ id: 'l1', reason: WON_STAGE_REFUSAL_MESSAGE }]);
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: 1, lost: 0 }]);

    await run({ operation: 'updated', events: store.takeAppWriteEvents() });

    expect(store.writes).toEqual([]);
  });

  it('applies the save rules to a save that also wrote composite fields and fields the read does not hold', async () => {
    const before = lead('l1', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const raw = {
      ...before,
      stageId: 'won',
      contactAddress: {
        addressStreet1: '1 Main St',
        addressStreet2: '',
        addressCity: 'Reno',
        addressPostcode: '',
        addressState: '',
        addressCountry: '',
        addressLat: 39.5,
        addressLng: -119.8,
      },
      description: { blocknote: '[{"type":"paragraph"}]', markdown: 'Call back' },
      website: { primaryLinkLabel: '', primaryLinkUrl: 'http://acme.example', secondaryLinks: [] },
      tags: ['GYM'],
    };
    const stored = { ...readLeadRow(raw), tags: null };
    const store = makeFakeLeadStore({ leads: [stored], stages: STAGES, now: NOW });

    await makeRunLeadTrigger(store.triggerApi)({
      operation: 'updated',
      events: [updateEvent(before, stored, ['stage', 'stageId', 'contactAddress', 'description', 'website', 'tags'], raw)],
    });

    expect(store.rows.get('l1')).toMatchObject({
      probability: 100,
      dateClosed: NOW,
      wonStatus: 'WON',
      contactAddress: stored.contactAddress,
      tags: null,
    });
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: 1, lost: 0 }]);
  });

  it('gives a save that a newer save of the same field overtook only the computes', async () => {
    const start = lead('l1', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const store = makeFakeLeadStore({ leads: [start], stages: STAGES, now: NOW });

    await makeRunLeadTrigger(store.triggerApi)({
      operation: 'updated',
      events: [updateEvent(start, { ...start, stageId: 'won' }, ['stageId'])],
    });

    expect(store.writes).toEqual([]);
    expect(store.moves).toEqual([]);
  });

  it('puts back a probability below 100 % on a won lead, with a note, and its pass over the put-back writes nothing', async () => {
    const before = lead('l1', { stageId: 'won', probability: 100, automatedProbability: 100, wonStatus: 'WON', dateClosed: D, dayClose: 30 });
    const after = { ...before, probability: 50 };
    const store = makeFakeLeadStore({ leads: [after], stages: STAGES, now: NOW });
    const run = makeRunLeadTrigger(store.triggerApi);

    await run({ operation: 'updated', events: [updateEvent(before, after, ['probability'])] });

    expect(store.rows.get('l1')?.probability).toBe(100);
    expect(store.notes).toEqual([{ id: 'l1', reason: WON_STAGE_REFUSAL_MESSAGE }]);

    await run({ operation: 'updated', events: store.takeAppWriteEvents() });

    expect(store.writes).toEqual([]);
    expect(store.notes).toHaveLength(1);
  });

  it('destroys a lead created in a won stage below 100 % and reports why', async () => {
    const created = lead('l2', { stageId: 'won', probability: 40, createdBy: STAFF });
    const store = makeFakeLeadStore({ leads: [created], stages: STAGES, now: NOW });

    await expect(
      makeRunLeadTrigger(store.triggerApi)({
        operation: 'created',
        events: [leadEvent({ recordId: 'l2', workspaceMemberId: 'm1', properties: { after: created } })],
      }),
    ).rejects.toThrow(WON_STAGE_REFUSAL_MESSAGE);
    expect(store.destroyed).toEqual(['l2']);
  });

  it('settles a lead created by a member after one write: its creator becomes the salesperson', async () => {
    const created = lead('l3', { stageId: 'new', createdBy: STAFF, createdAt: NOW, dateLastStageUpdate: null });
    const store = makeFakeLeadStore({ leads: [created], stages: STAGES, now: NOW });
    const run = makeRunLeadTrigger(store.triggerApi);

    await run({ operation: 'created', events: [leadEvent({ recordId: 'l3', workspaceMemberId: 'm1', properties: { after: created } })] });

    expect(store.rows.get('l3')).toMatchObject({ salespersonId: 'm1', dateOpen: NOW, dayOpen: 0, dateLastStageUpdate: NOW });

    await run({ operation: 'updated', events: store.takeAppWriteEvents() });

    expect(store.writes).toEqual([]);
  });

  it('finishes the other leads when one write fails, then reports the failure', async () => {
    const goodBefore = lead('good', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const badBefore = lead('bad', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const store = makeFakeLeadStore({
      leads: [
        { ...goodBefore, stageId: 'won' },
        { ...badBefore, stageId: 'won' },
      ],
      stages: STAGES,
      now: NOW,
    });
    store.failOn.add('bad');

    await expect(
      makeRunLeadTrigger(store.triggerApi)({
        operation: 'updated',
        events: [
          updateEvent(badBefore, { ...badBefore, stageId: 'won' }, ['stageId']),
          updateEvent(goodBefore, { ...goodBefore, stageId: 'won' }, ['stageId']),
        ],
      }),
    ).rejects.toThrow('bad');
    expect(store.rows.get('good')?.wonStatus).toBe('WON');
  });

  it('writes the leads of a batch that get the same values in one request, so their own pass comes as one batch', async () => {
    const created = ['a', 'b', 'c'].map((id) => lead(id, { stageId: null, createdBy: STAFF, createdAt: NOW, dateLastStageUpdate: null }));
    const store = makeFakeLeadStore({ leads: created, stages: STAGES, now: NOW });
    const run = makeRunLeadTrigger(store.triggerApi);

    await run({
      operation: 'created',
      events: created.map((row) => leadEvent({ recordId: row.id, workspaceMemberId: 'm1', properties: { after: row } })),
    });

    expect(store.updateCalls).toEqual([['a', 'b', 'c']]);
    expect(store.rows.get('b')).toMatchObject({ stageId: 'new', salespersonId: 'm1', dateLastStageUpdate: NOW });
  });

  it('counts the status moves of the leads written only, when a shared write fails for one of them', async () => {
    const goodBefore = lead('good', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const badBefore = lead('bad', { stageId: 'new', probability: 40, automatedProbability: 40 });
    const store = makeFakeLeadStore({
      leads: [
        { ...goodBefore, stageId: 'won' },
        { ...badBefore, stageId: 'won' },
      ],
      stages: STAGES,
      now: NOW,
    });
    store.failOn.add('bad');

    await expect(
      makeRunLeadTrigger(store.triggerApi)({
        operation: 'updated',
        events: [
          updateEvent(badBefore, { ...badBefore, stageId: 'won' }, ['stageId']),
          updateEvent(goodBefore, { ...goodBefore, stageId: 'won' }, ['stageId']),
        ],
      }),
    ).rejects.toThrow('bad');
    expect(store.moves.map((entry) => entry.lead.id)).toEqual(['good']);
  });

  it('makes a failed shared write again lead by lead for its own hundred leads only', async () => {
    const befores = Array.from({ length: 150 }, (_, index) => lead(`l${index}`, { stageId: 'new', probability: 40, automatedProbability: 40 }));
    const store = makeFakeLeadStore({ leads: befores.map((row) => ({ ...row, stageId: 'won' })), stages: STAGES, now: NOW });
    store.failOn.add('l120');

    await expect(
      makeRunLeadTrigger(store.triggerApi)({
        operation: 'updated',
        events: befores.map((row) => updateEvent(row, { ...row, stageId: 'won' }, ['stageId'])),
      }),
    ).rejects.toThrow('l120');
    const writesOf = (id: string) => store.writes.filter((write) => write.id === id).length;

    expect(writesOf('l0')).toBe(1);
    expect(writesOf('l99')).toBe(1);
    expect(writesOf('l100')).toBe(1);
    expect(writesOf('l120')).toBe(0);
    expect(store.moves).toHaveLength(149);
  });
});
