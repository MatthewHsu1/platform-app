import { describe, expect, it } from 'vitest';

import { planMemberOrder } from 'src/crm/assignment/utils/member-order.util';

const sequence = (values: number[]) => {
  let index = 0;

  return () => values[index++];
};

const member = (membershipId: string, assignmentOptout = false) => ({ membershipId, assignmentOptout });

describe('planMemberOrder', () => {
  it('puts the largest remaining quota first and breaks ties at random', () => {
    const quotas = new Map([
      ['m1', 2],
      ['m2', 5],
      ['m3', 2],
    ]);

    expect(planMemberOrder([member('m1'), member('m2'), member('m3')], quotas, sequence([0.1, 0.5, 0.9])).map((m) => m.membershipId)).toEqual([
      'm2',
      'm3',
      'm1',
    ]);
    expect(planMemberOrder([member('m1'), member('m2'), member('m3')], quotas, sequence([0.9, 0.5, 0.1])).map((m) => m.membershipId)).toEqual([
      'm2',
      'm1',
      'm3',
    ]);
  });

  it('leaves out paused members and members with no quota left', () => {
    const quotas = new Map([
      ['m1', 1],
      ['m2', 0],
      ['m3', -1],
      ['m4', 3],
    ]);

    expect(planMemberOrder([member('m1', true), member('m2'), member('m3'), member('m4')], quotas, () => 0.5).map((m) => m.membershipId)).toEqual([
      'm4',
    ]);
  });
});
