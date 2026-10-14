import { describe, expect, it } from 'vitest';

import { planSchedule } from 'src/fieldservice/utils/plan-schedule.util';

describe('planSchedule', () => {
  it('start 09:00 plus end 11:30 gives duration 2.5 with seconds zeroed', () => {
    const plan = planSchedule(
      { scheduledStart: null, scheduledEnd: null, scheduledDurationHours: 0 },
      { scheduledStart: '2026-10-20T09:00:15.000Z', scheduledEnd: '2026-10-20T11:30:45.000Z' },
    );
    expect(plan).toEqual({
      scheduledStart: '2026-10-20T09:00:00.000Z',
      scheduledEnd: '2026-10-20T11:30:00.000Z',
      scheduledDurationHours: 2.5,
    });
  });

  it('start 09:00 plus duration 1.5 gives end 10:30', () => {
    const plan = planSchedule(
      { scheduledStart: null, scheduledEnd: null, scheduledDurationHours: 0 },
      { scheduledStart: '2026-10-20T09:00:00.000Z', scheduledDurationHours: 1.5 },
    );
    expect(plan.scheduledEnd).toBe('2026-10-20T10:30:00.000Z');
  });

  it('end 11:00 with stored duration 2 gives start 09:00', () => {
    const plan = planSchedule(
      { scheduledStart: null, scheduledEnd: null, scheduledDurationHours: 2 },
      { scheduledEnd: '2026-10-20T11:00:00.000Z' },
    );
    expect(plan.scheduledStart).toBe('2026-10-20T09:00:00.000Z');
  });

  it('clearing the start clears the end', () => {
    const plan = planSchedule(
      { scheduledStart: '2026-10-20T09:00:00.000Z', scheduledEnd: '2026-10-20T10:00:00.000Z', scheduledDurationHours: 1 },
      { scheduledStart: null },
    );
    expect(plan.scheduledEnd).toBeNull();
  });

  it('a duration-only change on a stored order does not move the end', () => {
    const plan = planSchedule(
      { scheduledStart: '2026-10-20T09:00:00.000Z', scheduledEnd: '2026-10-20T10:00:00.000Z', scheduledDurationHours: 1 },
      { scheduledDurationHours: 3 },
    );
    expect(plan.scheduledEnd).toBeUndefined();
    expect(plan.scheduledDurationHours).toBe(3);
  });

  it('a start that only differs by seconds moves nothing', () => {
    const plan = planSchedule(
      { scheduledStart: '2026-10-20T09:00:00.000Z', scheduledEnd: '2026-10-20T10:00:00.000Z', scheduledDurationHours: 1 },
      { scheduledStart: '2026-10-20T09:00:15.000Z', scheduledDurationHours: 1 },
    );
    expect(plan).toEqual({});
  });

  it('a lone start derives the end from the stored duration', () => {
    const plan = planSchedule(
      { scheduledStart: null, scheduledEnd: null, scheduledDurationHours: 2 },
      { scheduledStart: '2026-10-20T09:00:00.000Z' },
    );
    expect(plan.scheduledEnd).toBe('2026-10-20T11:00:00.000Z');
  });
});
