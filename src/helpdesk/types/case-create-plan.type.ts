import { type CaseRow } from 'src/helpdesk/types/case-row.type';

export type CaseCreatePlan = {
  data: Partial<CaseRow>;
  needsNumber: boolean;
};
