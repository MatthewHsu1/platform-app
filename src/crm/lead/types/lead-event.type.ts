import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// One save of a lead as its database event tells it.
export type LeadEvent = {
  before: LeadRow | null;
  after: LeadRow;
  written: ReadonlySet<string>;
  appWrite: boolean;
  creatorMemberId: string | null;
};
