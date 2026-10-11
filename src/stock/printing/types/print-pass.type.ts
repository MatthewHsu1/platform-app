import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// What a print link may print: the ids were checked as the person who clicked,
// so the page reads them as the application later.
export type PrintPass = {
  report: PrintReportKey;
  objectSingular: string;
  recordIds: string[];
  options: Record<string, unknown>;
  workspaceMemberId: string | null;
  expiresAt: string;
};
