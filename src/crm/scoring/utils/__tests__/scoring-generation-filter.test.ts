import { describe, expect, it } from 'vitest';

import { matchesTwentyFilter } from 'src/crm/assignment/__tests__/fakes/matches-twenty-filter';
import { withScoringGeneration } from 'src/crm/scoring/utils/scoring-generation-filter.util';

const rowAt = (createdAt: string) => ({ variable: 'stage', createdAt });

describe('withScoringGeneration', () => {
  it('reads the rows of the current set only: none older, none a running rebuild is still writing', () => {
    const filter = withScoringGeneration({ variable: { eq: 'stage' } }, { since: '2026-10-10T00:00:00.000Z', before: '2026-10-12T00:00:00.000Z' });

    expect(matchesTwentyFilter(filter, rowAt('2026-10-09T23:59:59.999Z'))).toBe(false);
    expect(matchesTwentyFilter(filter, rowAt('2026-10-10T00:00:00.000Z'))).toBe(true);
    expect(matchesTwentyFilter(filter, rowAt('2026-10-12T00:00:00.000Z'))).toBe(false);
  });

  it('reads every row when no set was ever stored', () => {
    expect(withScoringGeneration({ variable: { eq: 'stage' } }, { since: null, before: null })).toEqual({ variable: { eq: 'stage' } });
  });
});
