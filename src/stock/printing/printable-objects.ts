import { markPrinted } from 'src/stock/printing/mark-printed';
import { type PrintOptionsParser } from 'src/stock/printing/types/print-options-parser.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { NO_PRINT_OPTIONS, printOptionsParser } from 'src/stock/printing/utils/print-options.util';

const PRODUCT_LABEL_OPTIONS = printOptionsParser({
  format: ['DYMO', 'PRICE_2X7', 'PRICE_4X7', 'PLAIN_4X12', 'PRICE_4X12', 'ZPL', 'ZPL_PRICE'],
  copies: 'number',
  moveQuantity: ['MOVE', 'CUSTOM'],
  zplTemplate: ['normal', 'small', 'alternative', 'jewelry'],
  pricelistId: 'string',
  extraContent: 'string',
});
const LOT_LABEL_OPTIONS = printOptionsParser({ labelQuantity: ['LOTS', 'UNITS'] });

// What may be printed from which object, the options each print takes, and what a print does at the
// click. Kept apart from the printables so the print button and Validate do not carry the document
// builders and the barcode encoder.
export const PRINTABLE_OBJECTS: Record<
  string,
  { objectPlural: string; reports: Partial<Record<PrintReportKey, PrintOptionsParser>> }
> = {
  stockPicking: {
    objectPlural: 'stockPickings',
    reports: {
      pickingOperations: NO_PRINT_OPTIONS,
      deliverySlip: NO_PRINT_OPTIONS,
      returnSlip: NO_PRINT_OPTIONS,
      productLabels: PRODUCT_LABEL_OPTIONS,
      lotLabelPdf: LOT_LABEL_OPTIONS,
      lotLabelZpl: LOT_LABEL_OPTIONS,
    },
  },
  productTemplate: { objectPlural: 'productTemplates', reports: { productLabels: PRODUCT_LABEL_OPTIONS } },
  productProduct: { objectPlural: 'productProducts', reports: { productLabels: PRODUCT_LABEL_OPTIONS } },
  stockLot: { objectPlural: 'stockLots', reports: { lotLabelPdf: NO_PRINT_OPTIONS, lotLabelZpl: NO_PRINT_OPTIONS } },
  stockPackage: { objectPlural: 'stockPackages', reports: { packageBarcodeZpl: NO_PRINT_OPTIONS } },
  stockPackageHistory: { objectPlural: 'stockPackageHistories', reports: { packageBarcodeZpl: NO_PRINT_OPTIONS } },
  stockPickingType: { objectPlural: 'stockPickingTypes', reports: { pickingTypeLabelZpl: NO_PRINT_OPTIONS } },
  productUom: { objectPlural: 'productUoms', reports: { packagingBarcodeZpl: NO_PRINT_OPTIONS } },
};

// Options that name a record: the print route keeps them only when the clicking user may read that record.
export const OPTION_RECORDS: Partial<Record<PrintReportKey, Record<string, { objectSingular: string; objectPlural: string }>>> = {
  productLabels: { pricelistId: { objectSingular: 'productPricelist', objectPlural: 'productPricelists' } },
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
