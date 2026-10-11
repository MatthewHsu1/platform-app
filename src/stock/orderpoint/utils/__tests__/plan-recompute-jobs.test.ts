import { describe, expect, it } from 'vitest';

import { planRecomputeJobs } from 'src/stock/orderpoint/utils/plan-recompute-jobs.util';

const ids = (count: number, prefix = 'op') => Array.from({ length: count }, (_, index) => `${prefix}-${String(index).padStart(5, '0')}`);
// Twenty refuses more than 200 jobs in one enqueue call, and a job id outside
// 1–128 letters, digits, '_', '.' or '-'.
const MAX_JOBS_PER_CALL = 200;
const JOB_ID = /^[\w.-]{1,128}$/;

describe('planRecomputeJobs', () => {
  it('plans nothing for no rules', () => {
    expect(planRecomputeJobs({ orderpointIds: [], now: new Date('2026-10-10T12:00:03.250Z') }).calls).toEqual([]);
  });

  it('gives the same job ids to the same rules asked twice close together, so the queue runs them once', () => {
    const first = planRecomputeJobs({ orderpointIds: ['op-2', 'op-1', 'op-1'], now: new Date('2026-10-10T12:00:01.000Z') });
    const second = planRecomputeJobs({ orderpointIds: ['op-1', 'op-2'], now: new Date('2026-10-10T12:00:08.000Z') });

    expect(second.calls).toEqual(first.calls);
    expect(first.calls.flat().flatMap((job) => job.payload.orderpointIds)).toEqual(['op-1', 'op-2']);
  });

  it('gives new job ids once the earlier run may have started, so a later change is never dropped', () => {
    const first = planRecomputeJobs({ orderpointIds: ['op-1'], now: new Date('2026-10-10T12:00:09.999Z') });
    const later = planRecomputeJobs({ orderpointIds: ['op-1'], now: new Date('2026-10-10T12:00:10.000Z') });

    expect(later.calls[0][0].jobId).not.toEqual(first.calls[0][0].jobId);
  });

  it('starts the runs only after every change of the same moment has been asked for', () => {
    const plan = planRecomputeJobs({ orderpointIds: ['op-1'], now: new Date('2026-10-10T12:00:03.250Z') });

    expect(new Date('2026-10-10T12:00:03.250Z').getTime() + plan.delayMs).toBeGreaterThanOrEqual(new Date('2026-10-10T12:00:10.000Z').getTime());
  });

  it('splits the jobs into calls Twenty accepts, with valid job ids, and asks for every rule once', () => {
    const asked = ids(30_000);
    const plan = planRecomputeJobs({ orderpointIds: asked, now: new Date('2026-10-10T12:00:00.000Z') });
    const jobs = plan.calls.flat();

    expect(plan.calls.length).toBeGreaterThan(1);
    expect(plan.calls.every((call) => call.length >= 1 && call.length <= MAX_JOBS_PER_CALL)).toBe(true);
    expect(jobs.every((job) => JOB_ID.test(job.jobId))).toBe(true);
    expect(new Set(jobs.map((job) => job.jobId)).size).toBe(jobs.length);
    expect(jobs.flatMap((job) => job.payload.orderpointIds).sort()).toEqual(asked);
  });
});
