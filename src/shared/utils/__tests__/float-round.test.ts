import { describe, expect, it } from 'vitest';

import { floatRound } from 'src/shared/utils/float-round.util';

describe('floatRound', () => {
  it('rounds up to the step, never to zero (UP)', () => {
    expect(floatRound(0.001, 0.01, 'UP')).toBe(0.01);
    expect(floatRound(0.15, 0.01, 'UP')).toBe(0.15);
  });

  it('rounds half up to a multiple of the step', () => {
    expect(floatRound(84.15, 5, 'HALF-UP')).toBe(85);
    expect(floatRound(2.5, 1, 'HALF-UP')).toBe(3);
    expect(floatRound(2.1667, 1, 'HALF-UP')).toBe(2);
  });

  it('rounds negatives away from zero on half', () => {
    expect(floatRound(-2.5, 1, 'HALF-UP')).toBe(-3);
  });

  it('keeps zero', () => {
    expect(floatRound(0, 0.01, 'UP')).toBe(0);
  });
});
