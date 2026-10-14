const MILLISECONDS_PER_HOUR = 3_600_000;

// A missing start or end means the job has no actual duration yet.
export const actualDuration = (startIso: string | null, endIso: string | null): number => {
  if (startIso === null || endIso === null) {
    return 0;
  }
  return (Date.parse(endIso) - Date.parse(startIso)) / MILLISECONDS_PER_HOUR;
};
