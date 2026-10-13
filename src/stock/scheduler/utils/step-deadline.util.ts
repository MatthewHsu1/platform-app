import { DAILY_JOB_REPORT_MARGIN_MS, DAILY_JOB_TIMEOUT_SECONDS } from 'src/stock/scheduler/daily-job-limits.constant';

// A step with a time budget stops at its budget or before the job's own limit, whichever comes first.
export const stepDeadline = ({
  now,
  jobStartedAt,
  budgetMs,
}: {
  now: number;
  jobStartedAt: number;
  budgetMs: number;
}) => Math.min(now + budgetMs, jobStartedAt + DAILY_JOB_TIMEOUT_SECONDS * 1_000 - DAILY_JOB_REPORT_MARGIN_MS);
