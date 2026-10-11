import { type PrintContext } from 'src/stock/printing/types/print-context.type';
import { type PrintOutput } from 'src/stock/printing/types/print-output.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// `read` runs as the application on a public page: it reads the records named by `recordIds`
// (checked as the person) and what hangs off them. An option never names a record to read.
export type Printable<TData> = {
  key: PrintReportKey;
  objectSingular: string;
  objectPlural: string;
  read: (recordIds: string[], options: Record<string, unknown>) => Promise<TData[]>;
  build: (data: TData[], options: Record<string, unknown>, context: PrintContext) => PrintOutput | Promise<PrintOutput>;
  fileName: (data: TData[], options: Record<string, unknown>) => string;
};
