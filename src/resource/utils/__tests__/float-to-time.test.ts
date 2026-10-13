import { describe, expect, it } from 'vitest';

import { floatToTime } from 'src/resource/utils/float-to-time.util';

describe('floatToTime', () => {
  it('turns hours into a time of day, minutes rounded', () => {
    expect(floatToTime(8)).toEqual({ hour: 8, minute: 0, second: 0, millisecond: 0 });
    expect(floatToTime(8.5)).toEqual({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    expect(floatToTime(12.25)).toEqual({ hour: 12, minute: 15, second: 0, millisecond: 0 });
    expect(floatToTime(16.9959)).toEqual({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  });

  it('reads 24 as the last moment of the day', () => {
    expect(floatToTime(24)).toEqual({ hour: 23, minute: 59, second: 59, millisecond: 999 });
  });
});
