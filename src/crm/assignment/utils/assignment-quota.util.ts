import { floatRound } from 'src/shared/utils/float-round.util';

const DAYS_PER_CAPACITY_PERIOD = 30;

// A salesperson's daily share of their 30-day capacity, half rounded up. A
// scheduled run also takes away what they received in the last 24 hours, so
// several runs a day never pass the daily share; a manual run gives it again.
export const assignmentQuota = ({
  assignmentMax,
  forceQuota,
  leadDayCount,
}: {
  assignmentMax: number;
  forceQuota: boolean;
  leadDayCount: number;
}) => {
  const quota = floatRound(assignmentMax / DAYS_PER_CAPACITY_PERIOD, 1, 'HALF-UP');

  return forceQuota ? quota : quota - leadDayCount;
};
