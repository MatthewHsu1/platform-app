import { describe, expect, it } from 'vitest';

import { padPoint } from 'src/stock/utils/signature-pad-point.util';

describe('padPoint', () => {
  const pad = { left: 1117, top: 88, width: 400, height: 200 };

  it('places the pointer relative to the pad, in tenths of a pixel', () => {
    expect(padPoint(1157, 128, pad)).toEqual([40, 40]);
    expect(padPoint(1177.26, 135.54, pad)).toEqual([60.3, 47.5]);
  });

  it('gives no point while the pad has not been measured yet', () => {
    expect(padPoint(1157, 128, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});
