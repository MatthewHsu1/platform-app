import { describe, expect, it } from 'vitest';

import { lead } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { isCreatedOnOrAfter, isScoringStartDate, safeScoringFields, scoringPairs } from 'src/crm/scoring/utils/scoring-pairs.util';

describe('scoringPairs', () => {
  it('lists the stage, the set fields, both quality values and one pair per tag', () => {
    const pairs = scoringPairs(
      lead({ stageId: 'new', sourceId: 'src0', country: 'Belgium', state: null, phoneState: 'CORRECT', emailState: null, language: 'EN_US', tags: ['A', 'B'] }),
      ['phoneState', 'emailState', 'state', 'country', 'source', 'language', 'tags'],
    );

    expect(pairs).toEqual([
      ['stage', 'new'],
      ['phoneState', 'CORRECT'],
      ['emailState', 'False'],
      ['country', 'Belgium'],
      ['source', 'src0'],
      ['language', 'EN_US'],
      ['tag', 'A'],
      ['tag', 'B'],
    ]);
  });

  it('leaves out a lead without a stage from the stage pair and fields that are not chosen', () => {
    expect(scoringPairs(lead({ sourceId: 'src0', tags: ['A'] }), ['source'])).toEqual([['source', 'src0']]);
  });
});

describe('safeScoringFields', () => {
  it('keeps the known keys in the given order and drops the rest', () => {
    expect(safeScoringFields(['tags', 'country', 'stage', 'unknown'])).toEqual(['tags', 'country']);
    expect(safeScoringFields('country')).toEqual([]);
    expect(safeScoringFields(null)).toEqual([]);
  });
});

describe('the start date', () => {
  it('accepts only a calendar date', () => {
    expect(isScoringStartDate('2000-01-01')).toBe(true);
    expect(isScoringStartDate('2026-02-30')).toBe(false);
    expect(isScoringStartDate('yesterday')).toBe(false);
    expect(isScoringStartDate(null)).toBe(false);
    expect(isScoringStartDate('')).toBe(false);
  });

  it('counts a lead created on the start day itself', () => {
    expect(isCreatedOnOrAfter('2026-10-01T23:59:00.000Z', '2026-10-01')).toBe(true);
    expect(isCreatedOnOrAfter('2026-09-30T23:59:59.000Z', '2026-10-01')).toBe(false);
  });
});
