import { describe, expect, it } from 'vitest';

import { makeRebuildScoring } from 'src/crm/scoring/rebuild-scoring';
import { type RebuildScoringApi } from 'src/crm/scoring/types/rebuild-scoring-api.type';
import { type ScoringGeneration } from 'src/crm/scoring/types/scoring-generation.type';
import { lead, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';

const NOW = '2026-10-12T20:00:00.000Z';
const SETTINGS = { plsStartDate: '2026-01-01', plsFields: [] };

// The scoring table with the rows of the last rebuild, and the generation the score reads.
const fakeTable = ({ destroyFailures = 0, createFails = false }: { destroyFailures?: number; createFails?: boolean } = {}) => {
  const rows = new Map<string, { createdAt: string }>(
    Array.from({ length: 120 }, (_, index) => [`old-${index}`, { createdAt: '2026-10-01T00:00:00.000Z' }]),
  );
  const state = { generation: { since: '2026-10-01T00:00:00.000Z', before: null } as ScoringGeneration, destroyFailures, created: 0 };
  const api: RebuildScoringApi = {
    now: () => NOW,
    readRowIds: async () => [...rows.keys()],
    readGeneration: async () => state.generation,
    writeGeneration: async (generation) => {
      state.generation = generation;
    },
    createRows: async (creates) => {
      if (createFails) {
        rows.set('new-partial', { createdAt: NOW });
        throw new Error('Create crmLeadScoringFrequencies: Query read timeout');
      }
      creates.forEach((_row, index) => rows.set(`new-${index}`, { createdAt: NOW }));
      state.created += creates.length;
    },
    destroyRows: async (ids) => {
      if (state.destroyFailures > 0) {
        state.destroyFailures -= 1;
        throw new Error('Destroy crmLeadScoringFrequencies: Query read timeout');
      }
      ids.forEach((id) => rows.delete(id));
    },
    readClosedLeads: async () => [
      lead({ id: 'won', stageId: 'won', wonStatus: 'WON', probability: 100 }),
      lead({ id: 'lost', stageId: 'new', wonStatus: 'LOST', probability: 0 }),
    ],
    readPendingLeads: async () => [lead({ id: 'open', stageId: 'won', wonStatus: 'PENDING', probability: 10, automatedProbability: 10 })],
    readStages: async () => STAGES,
    updateLeads: async () => undefined,
    wait: async () => undefined,
  };
  // The rows the score reads under the current generation.
  const readable = () =>
    [...rows.entries()].filter(
      ([, row]) =>
        (state.generation.since === null || row.createdAt >= state.generation.since) &&
        (state.generation.before === null || row.createdAt < state.generation.before),
    );

  return { api, rows, state, readable };
};

describe('rebuildScoring', () => {
  it('keeps the score on a whole set of counts when the old rows cannot be removed', async () => {
    const table = fakeTable({ destroyFailures: 1000 });

    const result = await makeRebuildScoring(table.api)(SETTINGS);

    expect(table.readable().every(([id]) => id.startsWith('new-'))).toBe(true);
    expect(table.readable()).toHaveLength(table.state.created);
    expect(result.oldRowsLeft).toBe(120);
    expect(result.leadsWritten).toBe(1);
  });

  it('keeps the score on the old counts, untouched, when the new rows cannot be written', async () => {
    const table = fakeTable({ createFails: true });

    await expect(makeRebuildScoring(table.api)(SETTINGS)).rejects.toThrow('Query read timeout');
    expect(table.readable().map(([id]) => id)).toEqual(Array.from({ length: 120 }, (_, index) => `old-${index}`));
  });

  it('removes the old rows a few at a time and tries a part again when the database times out', async () => {
    const table = fakeTable({ destroyFailures: 2 });

    const result = await makeRebuildScoring(table.api)(SETTINGS);

    expect(result.oldRowsLeft).toBe(0);
    expect([...table.rows.keys()].some((id) => id.startsWith('old-'))).toBe(false);
  });
});
