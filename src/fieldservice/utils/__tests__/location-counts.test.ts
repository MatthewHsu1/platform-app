import { describe, expect, it } from 'vitest';

import { locationCounts } from 'src/fieldservice/utils/location-counts.util';

describe('locationCounts', () => {
  it('counts the whole subtree: sub-locations below, equipment here and below', () => {
    const counts = locationCounts(
      [
        { id: 'site', parentId: null },
        { id: 'floor', parentId: 'site' },
        { id: 'room', parentId: 'floor' },
      ],
      ['room', 'room', 'site', null],
    );

    expect(counts).toEqual([
      { id: 'site', equipmentCount: 3, sublocationCount: 2 },
      { id: 'floor', equipmentCount: 2, sublocationCount: 1 },
      { id: 'room', equipmentCount: 2, sublocationCount: 0 },
    ]);
  });
});
