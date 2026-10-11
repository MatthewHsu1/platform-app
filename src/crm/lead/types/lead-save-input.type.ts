import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

export type LeadSaveInput = {
  operation: 'created' | 'updated';
  before: LeadRow | null;
  after: LeadRow;
  written: ReadonlySet<string>;
  now: string;
  context: LeadContext;
  creatorMemberId: string | null;
};
