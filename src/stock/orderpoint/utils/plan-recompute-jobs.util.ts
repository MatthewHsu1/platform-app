import { derivedId } from 'src/shared/utils/derived-id.util';
import { type RecomputeJob } from 'src/stock/orderpoint/types/recompute-job.type';
import { chunks } from 'src/shared/utils/chunks.util';

const IDS_PER_JOB = 50;
// Twenty takes at most 200 jobs per enqueue call.
const JOBS_PER_CALL = 200;
const WINDOW_MS = 10_000;
// Job ids are shared by every app of the workspace. A dot, not a dash, before
// the uuid: Twenty reads a dash and a uuid at the end as its own suffix.
const JOB_ID_PREFIX = 'platform-orderpoint-recompute';

// The queue starts no second run for a job id it still holds, finished runs
// included. So a job id names the rules and a 10-second window, and the run
// waits for the window to end: every ask inside it collapses into one run that
// starts after the last of them, and a later ask gets a new id.
export const planRecomputeJobs = ({ orderpointIds, now }: { orderpointIds: string[]; now: Date }) => {
  const windowStart = Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS;
  const jobs = chunks([...new Set(orderpointIds)].sort(), IDS_PER_JOB).map(
    (ids): RecomputeJob => ({
      jobId: `${JOB_ID_PREFIX}.${derivedId(String(windowStart), ...ids)}`,
      payload: { orderpointIds: ids },
    }),
  );

  return { delayMs: windowStart + WINDOW_MS - now.getTime(), calls: chunks(jobs, JOBS_PER_CALL) };
};
