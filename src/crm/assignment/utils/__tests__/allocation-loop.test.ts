import { describe, expect, it, vi } from 'vitest';

import { runAllocationLoop } from 'src/crm/assignment/utils/allocation-loop.util';

const cycle = (values: number[]) => {
  let index = 0;

  return () => values[index++ % values.length];
};

describe('runAllocationLoop', () => {
  it('gives each lead to one team, drawn by capacity, until no team has a lead left', async () => {
    const allocate = vi.fn(async (_teamId: string, leadId: string) => ({ done: [leadId] }));
    const { allocations } = await runAllocationLoop({
      teams: [
        { teamId: 'A', weight: 30, leadIds: ['l1', 'l2', 'l3'] },
        { teamId: 'B', weight: 60, leadIds: ['l1', 'l2', 'l3'] },
      ],
      random: cycle([0.1, 0.5]),
      allocate,
    });

    expect(allocations).toEqual([
      { teamId: 'A', leadId: 'l1' },
      { teamId: 'B', leadId: 'l2' },
      { teamId: 'A', leadId: 'l3' },
    ]);
  });

  it('drops leads another allocation already took, such as merged duplicates', async () => {
    const { allocations } = await runAllocationLoop({
      teams: [
        { teamId: 'A', weight: 10, leadIds: ['l1', 'l2'] },
        { teamId: 'B', weight: 10, leadIds: ['l2', 'l3'] },
      ],
      random: cycle([0.1, 0.9]),
      allocate: async (_teamId, leadId) => ({ done: leadId === 'l1' ? ['l1', 'l2'] : [leadId] }),
    });

    expect(allocations).toEqual([
      { teamId: 'A', leadId: 'l1' },
      { teamId: 'B', leadId: 'l3' },
    ]);
  });

  it('never draws a team without capacity', async () => {
    const allocate = vi.fn(async (_teamId: string, leadId: string) => ({ done: [leadId] }));

    await runAllocationLoop({
      teams: [
        { teamId: 'A', weight: 0, leadIds: ['l1'] },
        { teamId: 'B', weight: 5, leadIds: ['l2'] },
      ],
      random: cycle([0]),
      allocate,
    });

    expect(allocate.mock.calls.map(([teamId]) => teamId)).toEqual(['B']);
  });

  it('stops for a team whose lead was taken elsewhere without looping', async () => {
    const { allocations } = await runAllocationLoop({
      teams: [{ teamId: 'A', weight: 1, leadIds: ['l1'] }],
      random: cycle([0]),
      allocate: async () => ({ done: [] }),
    });

    expect(allocations).toEqual([{ teamId: 'A', leadId: 'l1' }]);
  });
});
