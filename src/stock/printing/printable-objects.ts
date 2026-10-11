import { markPrinted } from 'src/stock/printing/mark-printed';
import { type PrintOptionsParser } from 'src/stock/printing/types/print-options-parser.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { NO_PRINT_OPTIONS } from 'src/stock/printing/utils/print-options.util';

// What may be printed from which object, the options each print takes, and what a print does at the
// click. Kept apart from the printables so the print button and Validate do not carry the document
// builders and the barcode encoder.
export const PRINTABLE_OBJECTS: Record<
  string,
  { objectPlural: string; reports: Partial<Record<PrintReportKey, PrintOptionsParser>> }
> = {
  stockPicking: {
    objectPlural: 'stockPickings',
    reports: { pickingOperations: NO_PRINT_OPTIONS, deliverySlip: NO_PRINT_OPTIONS, returnSlip: NO_PRINT_OPTIONS },
  },
  stockLot: { objectPlural: 'stockLots', reports: { lotLabelZpl: NO_PRINT_OPTIONS } },
  stockPackage: { objectPlural: 'stockPackages', reports: { packageBarcodeZpl: NO_PRINT_OPTIONS } },
  stockPackageHistory: { objectPlural: 'stockPackageHistories', reports: { packageBarcodeZpl: NO_PRINT_OPTIONS } },
  stockPickingType: { objectPlural: 'stockPickingTypes', reports: { pickingTypeLabelZpl: NO_PRINT_OPTIONS } },
  productUom: { objectPlural: 'productUoms', reports: { packagingBarcodeZpl: NO_PRINT_OPTIONS } },
};

export const AFTER_PRINT: Partial<Record<PrintReportKey, (recordIds: string[]) => Promise<void>>> = {
  pickingOperations: markPrinted,
};

// Own keys only: a name such as "constructor" must not reach the object prototype.
export const printableObject = (objectSingular: string) =>
  Object.prototype.hasOwnProperty.call(PRINTABLE_OBJECTS, objectSingular) ? PRINTABLE_OBJECTS[objectSingular] : undefined;

export const printOptionsParserOf = (objectSingular: string, report: string) => {
  const reports = printableObject(objectSingular)?.reports;

  return reports !== undefined && Object.prototype.hasOwnProperty.call(reports, report) ? reports[report as PrintReportKey] : undefined;
};
