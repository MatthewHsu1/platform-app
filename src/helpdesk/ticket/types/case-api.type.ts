import { type CaseContext } from 'src/helpdesk/types/case-context.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';

export type CaseApi = {
  // Fresh rows, not in the trash.
  readCases: (ids: string[]) => Promise<CaseRow[]>;
  loadContext: (cases: CaseRow[]) => Promise<CaseContext>;
  // The next number of the case series; null when no series is active.
  takeNumber: () => Promise<string | null>;
  // Written with the app token.
  writeCase: (id: string, data: Partial<CaseRow>) => Promise<void>;
};
