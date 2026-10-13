import { describe, expect, it } from 'vitest';

import { planLeaveDates } from 'src/resource/utils/plan-leave-dates.util';

const base = { memberTimeZone: 'Europe/Brussels', standardTimeZone: 'UTC', now: '2026-10-09T22:30:00.000Z' };

describe('planLeaveDates', () => {
  it('ends a time off at the end of its first day when no end is given', () => {
    expect(
      planLeaveDates({ ...base, operation: 'created', dateFrom: '2026-10-12T07:30:00.250Z', dateTo: null, written: new Set(['dateFrom']) }),
    ).toEqual({ kind: 'write', data: { dateTo: '2026-10-12T21:59:59.250Z' } });
  });

  it('fills today in the standard calendar zone when both dates are empty', () => {
    expect(
      planLeaveDates({ ...base, standardTimeZone: 'Europe/Brussels', operation: 'created', dateFrom: null, dateTo: null, written: new Set() }),
    ).toEqual({ kind: 'write', data: { dateFrom: '2026-10-08T22:00:00.000Z', dateTo: '2026-10-09T21:59:59.999Z' } });
  });

  it('moves the end with a start moved past it', () => {
    expect(
      planLeaveDates({ ...base, operation: 'updated', dateFrom: '2026-10-14T06:00:00.000Z', dateTo: '2026-10-13T15:00:00.000Z', written: new Set(['dateFrom']) }),
    ).toEqual({ kind: 'write', data: { dateTo: '2026-10-14T21:59:59.000Z' } });
  });

  it('refuses an end saved before the start', () => {
    expect(
      planLeaveDates({ ...base, operation: 'updated', dateFrom: '2026-10-14T06:00:00.000Z', dateTo: '2026-10-13T15:00:00.000Z', written: new Set(['dateTo']) }),
    ).toEqual({ kind: 'refuse', reason: 'The start of the time off must be before its end.' });
  });

  it('refuses a new time off whose given start is after its given end', () => {
    expect(
      planLeaveDates({
        ...base,
        operation: 'created',
        dateFrom: '2026-10-14T06:00:00.000Z',
        dateTo: '2026-10-13T15:00:00.000Z',
        written: new Set(['dateFrom', 'dateTo']),
      }).kind,
    ).toBe('refuse');
  });

  it('changes nothing for a valid time off', () => {
    expect(
      planLeaveDates({ ...base, operation: 'updated', dateFrom: '2026-10-14T06:00:00.000Z', dateTo: '2026-10-14T15:00:00.000Z', written: new Set(['dateFrom']) }),
    ).toEqual({ kind: 'write', data: {} });
  });
});
