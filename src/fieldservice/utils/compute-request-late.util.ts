import type { HoursByPriority } from 'src/fieldservice/types/hours-by-priority.type';
import type { RequestPriority } from 'src/fieldservice/types/request-priority.type';

const MILLISECONDS_PER_HOUR = 3_600_000;

const priorityIndex: Record<RequestPriority, number> = {
  normal: 0,
  low: 1,
  high: 2,
  urgent: 3,
};

// Request-late is the request-early plus the hours allowed for the priority,
// by position in the hours table (normal, low, high, urgent).
export const computeRequestLate = (
  earlyIso: string,
  priority: RequestPriority,
  hoursByPriority: HoursByPriority,
): string => {
  const hours = hoursByPriority[priorityIndex[priority]];
  return new Date(Date.parse(earlyIso) + hours * MILLISECONDS_PER_HOUR).toISOString();
};
