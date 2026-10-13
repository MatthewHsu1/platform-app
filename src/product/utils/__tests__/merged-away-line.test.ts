import { describe, expect, it } from 'vitest';

import { isMergedAwayLine } from 'src/product/utils/merged-away-line.util';

const at = '2026-10-08T00:00:00.000Z';

describe('isMergedAwayLine', () => {
  it('is true for the line the merge archived and deleted, next to the line it brought back', () => {
    expect(
      isMergedAwayLine({ active: false, deletedAt: at }, [{ active: true, deletedAt: null }]),
    ).toBe(true);
  });

  it('is false for a staff delete of an active line, even with a second line of the same attribute', () => {
    expect(
      isMergedAwayLine({ active: true, deletedAt: at }, [{ active: true, deletedAt: null }]),
    ).toBe(false);
  });

  it('is false for a deleted archived line when no active line of the same attribute is left', () => {
    expect(
      isMergedAwayLine({ active: false, deletedAt: at }, [
        { active: false, deletedAt: null },
        { active: true, deletedAt: at },
      ]),
    ).toBe(false);
  });

  it('is false for a line that is only archived', () => {
    expect(
      isMergedAwayLine({ active: false, deletedAt: null }, [{ active: true, deletedAt: null }]),
    ).toBe(false);
  });
});
