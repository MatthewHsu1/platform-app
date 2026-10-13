import { type PrintContext } from 'src/stock/printing/types/print-context.type';
import { type PrintOutput } from 'src/stock/printing/types/print-output.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { type RowFinder } from 'src/stock/types/row-finder.type';

// `read` reads the records named by `recordIds` and the records that hang off them through `find`.
// It runs twice: when the print is asked for, `find` reads as the clicking user and notes what
// they may see; on the public page, `find` reads as the app and keeps only those rows.
// Configuration (products, units, locations, operation types) is read directly as the app.
export type Printable<TData> = {
  key: PrintReportKey;
  objectSingular: string;
  objectPlural: string;
  read: (recordIds: string[], options: Record<string, unknown>, find: RowFinder) => Promise<TData[]>;
  build: (data: TData[], options: Record<string, unknown>, context: PrintContext) => PrintOutput | Promise<PrintOutput>;
  fileName: (data: TData[], options: Record<string, unknown>) => string;
};
