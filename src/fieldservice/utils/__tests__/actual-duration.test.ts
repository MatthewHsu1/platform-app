import { describe, expect, it } from 'vitest';

import { actualDuration } from 'src/fieldservice/utils/actual-duration.util';

describe('actualDuration', () => {
  it('09:00 to 11:30 is 2.5 hours; a missing end is 0', () => {
    expect(actualDuration('2026-10-20T09:00:00.000Z', '2026-10-20T11:30:00.000Z')).toBe(2.5);
    expect(actualDuration('2026-10-20T09:00:00.000Z', null)).toBe(0);
  });
});
