import { type CrmSettings } from 'src/crm/settings/types/crm-settings.type';

const UNIT_MS: Record<CrmSettings['intervalType'], number> = {
  MINUTES: 60_000,
  HOURS: 3_600_000,
  DAYS: 86_400_000,
  WEEKS: 604_800_000,
};

// Whether the schedule is due, and its next run. Missed runs are not made up:
// the next run moves past now by whole intervals.
export const planNextRun = ({
  nextRun,
  now,
  intervalNumber,
  intervalType,
}: {
  nextRun: string | null;
  now: string;
  intervalNumber: number;
  intervalType: CrmSettings['intervalType'];
}): { due: false } | { due: true; nextRun: string } => {
  if (!Number.isInteger(intervalNumber) || intervalNumber < 1 || intervalNumber > 99) {
    return { due: false };
  }
  const step = intervalNumber * UNIT_MS[intervalType];
  const nowMs = Date.parse(now);

  if (nextRun === null || Number.isNaN(Date.parse(nextRun))) {
    return { due: true, nextRun: new Date(nowMs + step).toISOString() };
  }
  let next = Date.parse(nextRun);

  if (nowMs < next) {
    return { due: false };
  }
  while (next <= nowMs) {
    next += step;
  }
  return { due: true, nextRun: new Date(next).toISOString() };
};
