import { describe, expect, it } from 'vitest';

import { type LocationTreeRow } from 'src/fieldservice/types/location-tree-row.type';
import { planLocationNames } from 'src/fieldservice/utils/plan-location-names.util';

const row = (values: Partial<LocationTreeRow> & { id: string }): LocationTreeRow => ({
  name: null,
  ref: null,
  direction: null,
  parentId: null,
  completeName: null,
  completeDirection: null,
  ...values,
});

describe('planLocationNames', () => {
  it('names a child after its parent and labels it with its reference', () => {
    const names = planLocationNames([
      row({ id: 'site', name: 'Main site', direction: 'Gate B', completeName: 'Main site', completeDirection: 'Gate B' }),
      row({ id: 'gym', name: 'Gym', ref: 'B1', parentId: 'site', direction: 'Second floor' }),
    ]);

    expect(names).toEqual([{ id: 'gym', completeName: 'Main site / [B1] Gym', completeDirection: 'Gate B; Second floor' }]);
  });

  it('renames the whole subtree when a parent is renamed', () => {
    const names = planLocationNames([
      row({ id: 'site', name: 'North site', completeName: 'Main site' }),
      row({ id: 'gym', name: 'Gym', parentId: 'site', completeName: 'Main site / Gym' }),
    ]);

    expect(names.map((name) => name.completeName)).toEqual(['North site', 'North site / Gym']);
  });

  it('names nothing in a loop of parents', () => {
    expect(planLocationNames([row({ id: 'a', name: 'A', parentId: 'b' }), row({ id: 'b', name: 'B', parentId: 'a' })])).toEqual([]);
  });
});
