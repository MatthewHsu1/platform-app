import { describe, expect, it } from 'vitest';

import {
  isPrintPassLive,
  isPrintPassToken,
  printPassDayKey,
  printPassExpiry,
  stalePrintPassDayKeys,
} from 'src/stock/printing/utils/print-pass.util';

describe('print pass', () => {
  it('expires ten minutes after it is made', () => {
    expect(printPassExpiry(new Date('2026-10-10T08:00:00.000Z'))).toBe('2026-10-10T08:10:00.000Z');
  });

  it('is live until its expiry and refused from that instant on', () => {
    const pass = { expiresAt: '2026-10-10T08:10:00.000Z' };

    expect(isPrintPassLive(pass, new Date('2026-10-10T08:09:59.999Z'))).toBe(true);
    expect(isPrintPassLive(pass, new Date('2026-10-10T08:10:00.000Z'))).toBe(false);
  });

  it('accepts only 32 bytes written as 64 lowercase hex characters', () => {
    expect(isPrintPassToken('ab'.repeat(32))).toBe(true);
    expect(isPrintPassToken('ab'.repeat(31))).toBe(false);
    expect(isPrintPassToken('AB'.repeat(32))).toBe(false);
    expect(isPrintPassToken(`${'ab'.repeat(31)}zz`)).toBe(false);
  });

  it('files a pass under its UTC day', () => {
    expect(printPassDayKey(new Date('2026-10-10T23:59:59.000Z'))).toBe('print-pass-day:2026-10-10');
  });

  it('clears the seven days before today, not today', () => {
    expect(stalePrintPassDayKeys(new Date('2026-10-01T00:00:05.000Z'))).toEqual([
      'print-pass-day:2026-09-30',
      'print-pass-day:2026-09-29',
      'print-pass-day:2026-09-28',
      'print-pass-day:2026-09-27',
      'print-pass-day:2026-09-26',
      'print-pass-day:2026-09-25',
      'print-pass-day:2026-09-24',
    ]);
  });
});
