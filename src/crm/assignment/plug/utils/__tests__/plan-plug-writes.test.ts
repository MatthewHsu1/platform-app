import { describe, expect, it } from 'vitest';

import { makeLead } from 'src/crm/assignment/__tests__/fakes/fake-assignment-api';
import { planPlugWrites } from 'src/crm/assignment/plug/utils/plan-plug-writes.util';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

const NOW = '2026-10-09T12:00:00.000Z';
const STAGES: StageRow[] = [
  { id: 'new', name: 'New', sequence: 1, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
];
const GUARD = { salespersonId: { is: 'NULL' } };

describe('planPlugWrites', () => {
  it('writes the team of a team-only answer when it changes, guarded on no salesperson', () => {
    expect(
      planPlugWrites({
        answer: {
          assignments: [
            { leadId: 'l1', teamId: 'T1', salespersonId: null },
            { leadId: 'l2', teamId: 'T1', salespersonId: null },
          ],
        },
        leads: [makeLead('l1'), makeLead('l2', { teamId: 'T1' })],
        stages: STAGES,
        now: NOW,
      }),
    ).toEqual({ writes: [{ leadId: 'l1', data: { teamId: 'T1' }, guard: GUARD }], answeredIds: ['l1', 'l2'] });
  });

  it('assigns and converts a lead answered with a salesperson, as the built-in run does', () => {
    expect(
      planPlugWrites({
        answer: { assignments: [{ leadId: 'l1', teamId: 'T1', salespersonId: 'u1' }] },
        leads: [makeLead('l1', { stageId: null })],
        stages: STAGES,
        now: NOW,
      }).writes,
    ).toEqual([
      {
        leadId: 'l1',
        data: { salespersonId: 'u1', dateOpen: NOW, leadType: 'OPPORTUNITY', dateConversion: NOW, stageId: 'new', teamId: 'T1' },
        guard: GUARD,
      },
    ]);
  });

  it('gives a won lead only its team, salesperson and assignment date', () => {
    expect(
      planPlugWrites({
        answer: { assignments: [{ leadId: 'l1', teamId: 'T1', salespersonId: 'u1' }] },
        leads: [makeLead('l1', { wonStatus: 'WON', teamId: 'T1' })],
        stages: STAGES,
        now: NOW,
      }).writes,
    ).toEqual([{ leadId: 'l1', data: { salespersonId: 'u1', dateOpen: NOW }, guard: GUARD }]);
  });
});
