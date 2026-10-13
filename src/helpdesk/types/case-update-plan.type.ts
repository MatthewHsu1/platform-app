import { type CaseRow } from 'src/helpdesk/types/case-row.type';

export type CaseUpdatePlan = {
  data: Partial<CaseRow>;
  stageSaved: boolean;
};
