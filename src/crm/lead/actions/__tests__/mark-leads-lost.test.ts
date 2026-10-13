import { describe, expect, it } from 'vitest';

import { makeMarkLeadsLost } from 'src/crm/lead/actions/mark-leads-lost';
import { leadRow, SAMPLE_STAGES } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

type StopPoint = 'status write' | 'automated probability write';

// Leads and notes held in memory; the run stops once at the given write, as a
// timeout would.
const fakeWorld = (leads: LeadRow[], stopPoint: StopPoint) => {
  const stored = new Map(leads.map((lead) => [lead.id, { ...lead }]));
  const notes = new Map<string, { recordId: string; title: string; body: string }>();
  let hasStopped = false;
  const stopOnce = (point: StopPoint) => {
    if (point === stopPoint && !hasStopped) {
      hasStopped = true;
      throw new Error('Task timed out');
    }
  };

  const apply = (leadIds: string[], data: Record<string, unknown>) => {
    for (const id of leadIds) {
      stored.set(id, { ...(stored.get(id) as LeadRow), ...data });
    }
  };

  const markLeadsLost = makeMarkLeadsLost({
    readLeads: async (leadIds) => leadIds.map((id) => ({ ...(stored.get(id) as LeadRow) })),
    readStages: async () => SAMPLE_STAGES,
    requireUpdateRights: async () => undefined,
    noteTitle: async () => 'Lost comment',
    addNotes: async (items) => {
      for (const { id, ...note } of items) {
        if (!notes.has(id)) {
          notes.set(id, note);
        }
      }
    },
    updateLeadsAsUser: async (leadIds, data) => {
      stopOnce('status write');
      apply(leadIds, data);
    },
    writeLeadsAsApplication: async (leadIds, data) => {
      stopOnce('automated probability write');
      apply(leadIds, data);
    },
  });

  return { stored, notes, markLeadsLost };
};

describe('mark leads lost', () => {
  it.each<StopPoint>(['status write', 'automated probability write'])(
    'ends with one closing note per lead, lost at 0 %%, when the dialog is sent again after a run stopped at the %s',
    async (stopPoint) => {
      const world = fakeWorld(
        [
          leadRow({ id: 'a', createdAt: '2026-02-01T00:00:00.000Z', name: 'Gym A', probability: 30, automatedProbability: 30 }),
          leadRow({ id: 'b', createdAt: '2026-02-01T00:00:01.000Z', name: 'Gym B', probability: 10, automatedProbability: 10 }),
        ],
        stopPoint,
      );
      const click = () =>
        world.markLeadsLost({ leadIds: ['a', 'b'], lostReasonId: 'reason-1', closingNote: 'Bought elsewhere', runId: 'run-1' });

      await expect(click()).rejects.toThrow('Task timed out');
      await click();

      expect([...world.notes.values()]).toEqual([
        { recordId: 'a', title: 'Lost comment', body: 'Bought elsewhere' },
        { recordId: 'b', title: 'Lost comment', body: 'Bought elsewhere' },
      ]);
      for (const id of ['a', 'b']) {
        expect(world.stored.get(id)).toMatchObject({
          wonStatus: 'LOST',
          probability: 0,
          automatedProbability: 0,
          lostReasonId: 'reason-1',
        });
      }
    },
  );
});
