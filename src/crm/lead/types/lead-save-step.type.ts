import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// One save of a lead as its event tells it.
export type LeadSaveStep = {
  before: LeadRow | null;
  after: LeadRow;
  written: ReadonlySet<string>;
  staff: boolean;
  creatorMemberId: string | null;
};
