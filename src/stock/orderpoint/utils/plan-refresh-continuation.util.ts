import { derivedId } from 'src/shared/utils/derived-id.util';

const WINDOW_MS = 10_000;
// Job ids are shared by every app of the workspace. A dot, not a dash, before
// the uuid: Twenty reads a dash and a uuid at the end as its own suffix.
const JOB_ID_PREFIX = 'platform-replenishment-refresh';

// The queue starts no second run for a job id it still holds, so the job id
// names the locations left and a 10-second window, and the run waits for the
// window to end: the same ask made twice collapses into one run.
export const planRefreshContinuation = ({ locationIds, locale, now }: { locationIds: string[]; locale: string; now: Date }) => {
  const windowStart = Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS;
  const ids = [...new Set(locationIds)].sort();

  return {
    jobId: `${JOB_ID_PREFIX}.${derivedId(String(windowStart), ...ids)}`,
    payload: { locationIds: ids, locale },
    delayMs: windowStart + WINDOW_MS - now.getTime(),
  };
};
