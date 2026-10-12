import { PRIORITY_RANK } from 'src/crm/crm-options.constant';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

const rankOf = (priority: string | null) => (priority === null ? 0 : (PRIORITY_RANK[priority] ?? 0));

// Highest priority first, then the newest, as the lead list orders them.
export const sortAllocationCandidates = <TLead extends Pick<LeadRow, 'id' | 'priority' | 'createdAt'>>(leads: TLead[]) =>
  [...leads].sort(
    (left, right) =>
      rankOf(right.priority) - rankOf(left.priority) ||
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );

// Creation order: the order equal-probability leads are handed out in.
export const sortAssignableLeads = <TLead extends Pick<LeadRow, 'id' | 'createdAt'>>(leads: TLead[]) =>
  [...leads].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
