import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

export type LeadComputesInput = {
  operation: 'created' | 'updated' | 'restored';
  before: LeadRow | null;
  lead: LeadRow;
  written: ReadonlySet<string>;
  staffSave: boolean;
  now: string;
  context: LeadContext;
  rescore?: boolean;
  opportunityNameTemplate?: string;
};
