import { describe, expect, it } from 'vitest';

import { normalizeIntervals, subtractIntervals } from 'src/resource/utils/intervals.util';

const iv = (start: number, stop: number) => ({ start, stop });

describe('interval sets', () => {
  it('merges overlapping intervals, keeps touching ones apart and drops empty ones', () => {
    expect(normalizeIntervals([iv(3, 5), iv(1, 3), iv(2, 3), iv(4, 6), iv(7, 7)])).toEqual([iv(1, 3), iv(3, 6)]);
  });

  it('cuts the removed parts out', () => {
    expect(subtractIntervals([iv(8, 12), iv(13, 17)], [iv(9, 10), iv(12, 13), iv(16, 20)])).toEqual([iv(8, 9), iv(10, 12), iv(13, 16)]);
    expect(subtractIntervals([iv(8, 12)], [iv(8, 12)])).toEqual([]);
    expect(subtractIntervals([iv(8, 12)], [iv(10, 10)])).toEqual([iv(8, 12)]);
  });
});
