import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// What may be printed from which object, and what a print does at the click. Kept apart from the
// printables so the print button and Validate do not carry the document builders and the barcode encoder.
export const PRINTABLE_OBJECTS: Record<string, { objectPlural: string; reports: PrintReportKey[] }> = {};

export const AFTER_PRINT: Partial<Record<PrintReportKey, (recordIds: string[]) => Promise<void>>> = {};
