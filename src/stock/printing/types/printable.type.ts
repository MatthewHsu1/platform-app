import { type PrintOutput } from 'src/stock/printing/types/print-output.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

export type Printable<TData> = {
  key: PrintReportKey;
  objectSingular: string;
  objectPlural: string;
  read: (recordIds: string[], options: Record<string, unknown>) => Promise<TData[]>;
  build: (data: TData[], options: Record<string, unknown>) => PrintOutput | Promise<PrintOutput>;
  fileName: (data: TData[], options: Record<string, unknown>) => string;
};
