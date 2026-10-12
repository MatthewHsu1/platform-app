import { describe, expect, it, vi } from 'vitest';

import { runAssignmentLoops } from 'src/crm/assignment/utils/assignment-loops.util';

const ids = (count: number) => Array.from({ length: count }, (_, index) => `l${index + 1}`);
const everyone = (leadIds: string[], members: string[]) => new Map(members.map((member) => [member, new Set(leadIds)]));
const accept = async () => true;

describe('runAssignmentLoops', () => {
  it('gives preferred leads to the member who prefers them first, then fills up round robin', async () => {
    const leadIds = ids(11);

    for (const members of [
      ['m1', 'm2', 'm3'],
      ['m2', 'm1', 'm3'],
      ['m3', 'm2', 'm1'],
    ]) {
      const result = await runAssignmentLoops({
        leads: leadIds.map((id) => ({ id, probability: 0 })),
        members,
        quotas: new Map(members.map((member) => [member, 5])),
        eligible: everyone(leadIds, members),
        preferred: new Map([['m1', new Set(leadIds.slice(0, 8))]]),
        assign: accept,
      });

      expect(result.get('m1')).toHaveLength(5);
      expect(result.get('m1')?.every((id) => leadIds.slice(0, 8).includes(id))).toBe(true);
      expect(result.get('m2')).toHaveLength(3);
      expect(result.get('m3')).toHaveLength(3);
    }
  });

  it('assigns the most probable leads first and rotates members', async () => {
    const result = await runAssignmentLoops({
      leads: [
        { id: 'l1', probability: 10 },
        { id: 'l2', probability: 50 },
        { id: 'l3', probability: 30 },
      ],
      members: ['a', 'b'],
      quotas: new Map([
        ['a', 2],
        ['b', 2],
      ]),
      eligible: everyone(['l1', 'l2', 'l3'], ['a', 'b']),
      preferred: new Map(),
      assign: accept,
    });

    expect(result.get('a')).toEqual(['l2', 'l1']);
    expect(result.get('b')).toEqual(['l3']);
  });

  it('gives a lead only to a member whose filter takes it and leaves the rest on the team', async () => {
    const result = await runAssignmentLoops({
      leads: [
        { id: 'l1', probability: 0 },
        { id: 'l2', probability: 0 },
      ],
      members: ['a', 'b'],
      quotas: new Map([
        ['a', 5],
        ['b', 5],
      ]),
      eligible: new Map([
        ['a', new Set(['l2'])],
        ['b', new Set<string>()],
      ]),
      preferred: new Map(),
      assign: accept,
    });

    expect(result.get('a')).toEqual(['l2']);
    expect(result.get('b') ?? []).toEqual([]);
  });

  it('assigns a lead two preferences share only once', async () => {
    const assign = vi.fn(accept);
    const result = await runAssignmentLoops({
      leads: [{ id: 'l1', probability: 0 }],
      members: ['a', 'b'],
      quotas: new Map([
        ['a', 5],
        ['b', 5],
      ]),
      eligible: everyone(['l1'], ['a', 'b']),
      preferred: new Map([
        ['a', new Set(['l1'])],
        ['b', new Set(['l1'])],
      ]),
      assign,
    });

    expect(assign).toHaveBeenCalledTimes(1);
    expect(result.get('a')).toEqual(['l1']);
  });

  it('keeps the quota and the member\'s turn when another writer took the lead first', async () => {
    const result = await runAssignmentLoops({
      leads: [
        { id: 'l1', probability: 90 },
        { id: 'l2', probability: 50 },
      ],
      members: ['a', 'b'],
      quotas: new Map([
        ['a', 1],
        ['b', 1],
      ]),
      eligible: everyone(['l1', 'l2'], ['a', 'b']),
      preferred: new Map(),
      assign: async (leadId) => leadId !== 'l1',
    });

    expect(result.get('a')).toEqual(['l2']);
    expect(result.get('b') ?? []).toEqual([]);
  });

  it('stops giving leads to a member whose quota is used up', async () => {
    const result = await runAssignmentLoops({
      leads: ids(3).map((id) => ({ id, probability: 0 })),
      members: ['a'],
      quotas: new Map([['a', 1]]),
      eligible: everyone(ids(3), ['a']),
      preferred: new Map(),
      assign: accept,
    });

    expect(result.get('a')).toEqual(['l1']);
  });
});
