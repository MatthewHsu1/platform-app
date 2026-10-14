import { describe, expect, it } from 'vitest';

import { ancestorIds } from 'src/fieldservice/utils/ancestor-ids.util';
import { refuseRecursion } from 'src/fieldservice/utils/refuse-recursion.util';

describe('ancestorIds', () => {
  it('lists the parents up to the root, nearest first', () => {
    const parents = new Map([
      ['room', 'floor'],
      ['floor', 'site'],
      ['site', null],
    ]);

    expect(ancestorIds('room', parents)).toEqual(['floor', 'site']);
  });

  it('ends at a loop, so a record put under its own child is refused', () => {
    const parents = new Map([
      ['site', 'room'],
      ['floor', 'site'],
      ['room', 'floor'],
    ]);
    const ancestors = ancestorIds('site', parents);

    expect(ancestors).toEqual(['room', 'floor', 'site']);
    expect(refuseRecursion('site', ancestors)).toBe(true);
  });
});
