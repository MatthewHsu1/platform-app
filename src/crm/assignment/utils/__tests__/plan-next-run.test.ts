import { describe, expect, it } from 'vitest';

import { planNextRun } from 'src/crm/assignment/utils/plan-next-run.util';

describe('planNextRun', () => {
  it('runs at once when no next run is set and schedules one interval later', () => {
    expect(planNextRun({ nextRun: null, now: '2020-11-02T10:00:00.000Z', intervalNumber: 19, intervalType: 'HOURS' })).toEqual({
      due: true,
      nextRun: '2020-11-03T05:00:00.000Z',
    });
    expect(planNextRun({ nextRun: null, now: '2020-11-02T10:00:00.000Z', intervalNumber: 2, intervalType: 'DAYS' })).toEqual({
      due: true,
      nextRun: '2020-11-04T10:00:00.000Z',
    });
  });

  it('waits until the next run comes', () => {
    expect(
      planNextRun({ nextRun: '2026-10-09T10:00:00.000Z', now: '2026-10-09T09:59:59.000Z', intervalNumber: 1, intervalType: 'HOURS' }),
    ).toEqual({
      due: false,
    });
  });

  it('runs when the next run is now or past and moves it by whole intervals past now', () => {
    expect(
      planNextRun({ nextRun: '2026-10-09T10:00:00.000Z', now: '2026-10-09T10:00:00.000Z', intervalNumber: 1, intervalType: 'HOURS' }),
    ).toEqual({
      due: true,
      nextRun: '2026-10-09T11:00:00.000Z',
    });
    expect(
      planNextRun({ nextRun: '2026-10-09T10:00:00.000Z', now: '2026-10-09T13:30:00.000Z', intervalNumber: 1, intervalType: 'HOURS' }),
    ).toEqual({
      due: true,
      nextRun: '2026-10-09T14:00:00.000Z',
    });
    expect(
      planNextRun({ nextRun: '2026-10-05T10:00:00.000Z', now: '2026-10-05T10:05:00.000Z', intervalNumber: 2, intervalType: 'WEEKS' }),
    ).toEqual({
      due: true,
      nextRun: '2026-10-19T10:00:00.000Z',
    });
    expect(
      planNextRun({ nextRun: '2026-10-09T10:00:00.000Z', now: '2026-10-09T10:20:00.000Z', intervalNumber: 15, intervalType: 'MINUTES' }),
    ).toEqual({
      due: true,
      nextRun: '2026-10-09T10:30:00.000Z',
    });
  });

  it('never runs on an interval outside 1 to 99', () => {
    expect(planNextRun({ nextRun: null, now: '2026-10-09T10:00:00.000Z', intervalNumber: 0, intervalType: 'DAYS' })).toEqual({ due: false });
    expect(planNextRun({ nextRun: null, now: '2026-10-09T10:00:00.000Z', intervalNumber: 100, intervalType: 'DAYS' })).toEqual({ due: false });
  });
});
