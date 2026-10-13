import { SLA_STATE } from 'src/helpdesk-sla/helpdesk-sla-options.constant';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';

// A case shows the earliest deadline of its rows in progress, and whether any row is expired.
export const planCaseSlaSummary = (rows: Pick<SlaRow, 'state' | 'deadline'>[]) => {
  const deadlines = rows
    .filter((row) => row.state === SLA_STATE.IN_PROGRESS && row.deadline !== null)
    .map((row) => row.deadline as string)
    .sort((left, right) => Date.parse(left) - Date.parse(right));

  return {
    slaDeadline: deadlines[0] ?? null,
    slaStateExpired: rows.some((row) => row.state === SLA_STATE.EXPIRED),
  };
};
