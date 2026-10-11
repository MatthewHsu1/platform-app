import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// One print made at Validate: one page for all the transfers it covers.
export type AutoprintJob = { report: PrintReportKey; pickingIds: string[]; options: Record<string, unknown> };
