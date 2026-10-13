import { type CaseRow } from 'src/helpdesk/types/case-row.type';

export type CaseEvent = {
  recordId: string;
  before: CaseRow | null;
  after: CaseRow;
  updatedFields: string[];
  workspaceMemberId: string | null;
};
