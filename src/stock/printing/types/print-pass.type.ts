import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { type PrintRows } from 'src/stock/printing/types/print-rows.type';

// What a print link may print: the ids were checked as the person who clicked, and `rows` holds
// every other row the print shows that they could read; the page reads them as the application.
export type PrintPass = {
  report: PrintReportKey;
  objectSingular: string;
  recordIds: string[];
  options: Record<string, unknown>;
  rows: PrintRows;
  timeZone: string;
  workspaceMemberId: string | null;
  expiresAt: string;
};
