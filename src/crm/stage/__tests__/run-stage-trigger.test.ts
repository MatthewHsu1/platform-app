import { describe, expect, it } from 'vitest';

import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { makeRunStageTrigger, STAGE_IN_USE_MESSAGE } from 'src/crm/stage/run-stage-trigger';
import { type StageTriggerApi } from 'src/crm/stage/types/stage-trigger-api.type';

const makeApi = ({ used = [], leads = {} }: { used?: string[]; leads?: Record<string, string[]> } = {}) => {
  const calls = {
    restored: [] as { id: string; reason: string }[],
    syncs: 0,
    cascaded: [] as string[][],
    writes: [] as { writes: AppLeadWrite[]; rescore?: boolean }[],
    leadQueries: [] as { stageIds: string[] }[],
    rotting: [] as string[][],
  };
  const api: StageTriggerApi = {
    stageIdsUsedByLeads: async (ids) => new Set(ids.filter((id) => used.includes(id))),
    restoreStage: async (id, reason) => {
      calls.restored.push({ id, reason });
    },
    openLeadIdsInStages: async (stageIds) => {
      calls.leadQueries.push({ stageIds });
      return stageIds.flatMap((id) => leads[id] ?? []);
    },
    writeLeads: async (writes, options) => {
      calls.writes.push({ writes, rescore: options?.rescore });
    },
    syncBoardGroups: async () => {
      calls.syncs += 1;
    },
    cascadeStageDelete: async (ids) => {
      calls.cascaded.push(ids);
    },
    recomputeRotting: async (ids) => {
      calls.rotting.push(ids);
    },
    memberLocale: async () => 'en',
    translate: (_locale, message) => message,
  };
  return { api, calls };
};

const event = (recordId: string, before: Record<string, unknown>, after: Record<string, unknown>, updatedFields: string[]) => ({
  recordId,
  properties: { before, after, updatedFields },
});

describe('stage trigger', () => {
  it('puts back a deleted stage that still holds a lead, with a note, and leaves the board alone', async () => {
    const { api, calls } = makeApi({ used: ['s1'] });

    await makeRunStageTrigger(api)({ operation: 'deleted', events: [{ recordId: 's1', properties: {} }] });

    expect(calls.restored).toEqual([{ id: 's1', reason: STAGE_IN_USE_MESSAGE }]);
    expect(calls.syncs).toBe(0);
    expect(calls.cascaded).toEqual([]);
  });

  it('removes the column and the links of a deleted stage no lead uses', async () => {
    const { api, calls } = makeApi({ used: ['s1'] });

    await makeRunStageTrigger(api)({
      operation: 'deleted',
      events: [
        { recordId: 's1', properties: {} },
        { recordId: 's2', properties: {} },
      ],
    });

    expect(calls.cascaded).toEqual([['s2']]);
    expect(calls.syncs).toBe(1);
  });

  it('puts every open lead of a stage newly marked won at 100 %, also those already there', async () => {
    const { api, calls } = makeApi({ leads: { s1: ['l1', 'l2'] } });

    await makeRunStageTrigger(api)({ operation: 'updated', events: [event('s1', { isWon: false }, { isWon: true }, ['isWon'])] });

    expect(calls.writes).toEqual([
      {
        writes: [
          { leadId: 'l1', data: { probability: 100, automatedProbability: 100 } },
          { leadId: 'l2', data: { probability: 100, automatedProbability: 100 } },
        ],
        rescore: undefined,
      },
    ]);
  });

  it('asks for a fresh score of the open leads of a stage no longer won', async () => {
    const { api, calls } = makeApi({ leads: { s1: ['l1'] } });

    await makeRunStageTrigger(api)({ operation: 'updated', events: [event('s1', { isWon: true }, { isWon: false }, ['isWon'])] });

    expect(calls.writes).toEqual([{ writes: [{ leadId: 'l1', data: {} }], rescore: true }]);
  });

  it('redraws the board columns for a new or restored stage and for a new sequence or name', async () => {
    const { api, calls } = makeApi();
    const run = makeRunStageTrigger(api);

    await run({ operation: 'created', events: [{ recordId: 's9', properties: { after: { sequence: 4 } } }] });
    await run({ operation: 'restored', events: [{ recordId: 's9', properties: {} }] });
    await run({ operation: 'updated', events: [event('s1', { sequence: 1 }, { sequence: 9 }, ['sequence'])] });
    await run({ operation: 'updated', events: [event('s1', { name: 'A' }, { name: 'B' }, ['name'])] });

    expect(calls.syncs).toBe(4);
  });

  it('keeps the columns as they are when only the colour changes', async () => {
    const { api, calls } = makeApi();

    await makeRunStageTrigger(api)({ operation: 'updated', events: [event('s1', { color: 'red' }, { color: 'blue' }, ['color'])] });

    expect(calls.syncs).toBe(0);
  });

  it("refreshes the rotting of a stage's leads when its days to rot change", async () => {
    const { api, calls } = makeApi();

    await makeRunStageTrigger(api)({
      operation: 'updated',
      events: [
        event('s1', { rottingThresholdDays: 0 }, { rottingThresholdDays: 5 }, ['rottingThresholdDays']),
        event('s2', { name: 'A' }, { name: 'B' }, ['name']),
      ],
    });

    expect(calls.rotting).toEqual([['s1']]);
  });
});
