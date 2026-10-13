import { type Printable } from 'src/stock/printing/types/printable.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// One report may print from several objects (package and package history).
export const printableKey = (key: PrintReportKey, objectSingular: string) => `${key}:${objectSingular}`;

export const PRINTABLES = new Map<string, Printable<unknown>>();

export const registerPrintable = <TData>(printable: Printable<TData>) => {
  PRINTABLES.set(printableKey(printable.key, printable.objectSingular), printable as Printable<unknown>);
};
