import { describe, expect, it } from 'vitest';

import { roundRobin } from 'src/crm/lead/actions/utils/round-robin.util';

describe('roundRobin', () => {
  it('hands the leads to the salespersons in turn, by position', () => {
    expect(roundRobin(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], ['S1', 'S2', 'S3', 'S4'])).toEqual([
      { item: 'L1', salespersonId: 'S1' },
      { item: 'L2', salespersonId: 'S2' },
      { item: 'L3', salespersonId: 'S3' },
      { item: 'L4', salespersonId: 'S4' },
      { item: 'L5', salespersonId: 'S1' },
      { item: 'L6', salespersonId: 'S2' },
    ]);
  });

  it('assigns nobody without salespersons', () => {
    expect(roundRobin(['L1'], [])).toEqual([]);
  });
});
