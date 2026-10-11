import { describe, expect, it } from 'vitest';

import { planRefreshContinuation } from 'src/stock/orderpoint/utils/plan-refresh-continuation.util';

// Twenty refuses a job id outside 1–128 letters, digits, '_', '.' or '-'.
const JOB_ID = /^[\w.-]{1,128}$/;

describe('planRefreshContinuation', () => {
  it('carries the locations still to refresh and the language of the names', () => {
    const plan = planRefreshContinuation({ locationIds: ['loc-2', 'loc-1', 'loc-2'], locale: 'fr-FR', now: new Date('2026-10-10T12:00:01.000Z') });

    expect(plan.payload).toEqual({ locationIds: ['loc-1', 'loc-2'], locale: 'fr-FR' });
    expect(JOB_ID.test(plan.jobId)).toBe(true);
  });

  it('gives the same job id to the same locations asked twice close together, so the queue runs them once', () => {
    const first = planRefreshContinuation({ locationIds: ['loc-1', 'loc-2'], locale: 'en', now: new Date('2026-10-10T12:00:01.000Z') });
    const second = planRefreshContinuation({ locationIds: ['loc-2', 'loc-1'], locale: 'en', now: new Date('2026-10-10T12:00:08.000Z') });

    expect(second.jobId).toEqual(first.jobId);
  });

  it('gives a new job id to other locations, or once the earlier run may have started', () => {
    const first = planRefreshContinuation({ locationIds: ['loc-1'], locale: 'en', now: new Date('2026-10-10T12:00:09.999Z') });

    expect(planRefreshContinuation({ locationIds: ['loc-1'], locale: 'en', now: new Date('2026-10-10T12:00:10.000Z') }).jobId).not.toEqual(first.jobId);
    expect(planRefreshContinuation({ locationIds: ['loc-2'], locale: 'en', now: new Date('2026-10-10T12:00:09.999Z') }).jobId).not.toEqual(first.jobId);
  });

  it('starts the run only after every ask of the same moment', () => {
    const plan = planRefreshContinuation({ locationIds: ['loc-1'], locale: 'en', now: new Date('2026-10-10T12:00:03.250Z') });

    expect(new Date('2026-10-10T12:00:03.250Z').getTime() + plan.delayMs).toBeGreaterThanOrEqual(new Date('2026-10-10T12:00:10.000Z').getTime());
  });
});
