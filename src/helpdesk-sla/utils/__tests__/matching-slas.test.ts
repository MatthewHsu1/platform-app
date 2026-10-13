import { describe, expect, it } from 'vitest';

import { matchingSlas } from 'src/helpdesk-sla/utils/matching-slas.util';
import { policy } from 'src/helpdesk-sla/utils/__tests__/sla-fixtures';

const POLICIES = [
  policy(),
  policy({ id: 'teamOnly', teamIds: ['team1'] }),
  policy({ id: 'categoryOnly', categoryIds: ['category1'] }),
  policy({ id: 'tagOnly', tagIds: ['tag1'] }),
  policy({ id: 'archived', active: false }),
];
const slaCase = (extra: Partial<{ teamId: string | null; categoryId: string | null; tagIds: string[] }> = {}) => ({
  id: 'case1',
  createdAt: '2026-01-05T09:00:00.000Z',
  stageId: 'new',
  filterRecord: {},
  teamId: 'team1',
  categoryId: null,
  tagIds: [],
  ...extra,
});
const ids = (rows: { id: string }[]) => rows.map((item) => item.id).sort();

describe('matchingSlas', () => {
  it('applies a policy without filters to every case and a team policy to that team only', () => {
    expect(ids(matchingSlas(slaCase(), POLICIES))).toEqual(['generic', 'teamOnly']);
    expect(ids(matchingSlas(slaCase({ teamId: 'team2' }), POLICIES))).toEqual(['generic']);
    expect(ids(matchingSlas(slaCase({ teamId: null }), POLICIES))).toEqual(['generic']);
  });

  it('applies a category policy only to cases of that category', () => {
    expect(ids(matchingSlas(slaCase({ categoryId: 'category1' }), POLICIES))).toEqual(['categoryOnly', 'generic', 'teamOnly']);
    expect(ids(matchingSlas(slaCase({ teamId: 'team2', categoryId: 'category2' }), POLICIES))).toEqual(['generic']);
  });

  it('applies a tag policy only to cases with one of its tags', () => {
    expect(ids(matchingSlas(slaCase({ tagIds: ['tag1'] }), POLICIES))).toEqual(['generic', 'tagOnly', 'teamOnly']);
    expect(ids(matchingSlas(slaCase({ teamId: 'team2', tagIds: ['tag2'] }), POLICIES))).toEqual(['generic']);
  });

  it('applies a policy with a filter only to the cases the filter matches', () => {
    const filtered = policy({
      id: 'filtered',
      domain: JSON.stringify({ combinator: 'and', rules: [{ field: 'tagIds', operator: 'containsAny', value: ['tag1'] }] }),
    });
    const withTag = { ...slaCase({ tagIds: ['tag1'] }), filterRecord: { tagIds: ['tag1'] } };
    const otherTag = { ...slaCase({ teamId: 'team2', tagIds: ['tag2'] }), filterRecord: { tagIds: ['tag2'] } };

    expect(ids(matchingSlas(withTag, [filtered]))).toEqual(['filtered']);
    expect(ids(matchingSlas(otherTag, [filtered]))).toEqual([]);
  });

  it('applies no policy whose filter cannot be read', () => {
    expect(ids(matchingSlas(slaCase(), [policy({ id: 'broken', domain: '{not json' })]))).toEqual([]);
  });
});
