import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// The kept lead, the leads merged into it, and the values written on the kept
// lead (lead field names).
export type LeadMergePlan = { headId: string; tailIds: string[]; data: Partial<LeadRow> };
