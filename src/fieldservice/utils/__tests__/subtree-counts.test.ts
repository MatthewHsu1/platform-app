import { describe, expect, it } from 'vitest';

import { subtreeCounts } from 'src/fieldservice/utils/subtree-counts.util';

describe('subtreeCounts', () => {
  it('counts locations and equipment in the collected subtree', () => {
    expect(subtreeCounts([{ kind: 'location' }, { kind: 'equipment' }, { kind: 'equipment' }])).toEqual({ locations: 1, equipment: 2 });
  });
});
