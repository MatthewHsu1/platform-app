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
// The lines the user unfolded on screen, so the print shows the report as they had it.
const TRACEABILITY_OPTIONS = printOptionsParser({ openLineIds: 'idList' });
// From the reception report, the labels follow what is allocated: all of it, or one delivery's or
// one line's delivery moves.
const RECEPTION_LABEL_OPTIONS = printOptionsParser({ allocatedOnly: 'boolean', moveIds: 'idList' });

// What may be printed from which object, the options each print takes, and what a print does at the
// click. Kept apart from the printables so a caller that only checks a print does not carry the
// document builders.
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
      pickingPackages: NO_PRINT_OPTIONS,
      receptionReport: NO_PRINT_OPTIONS,
      receptionReportLabels: RECEPTION_LABEL_OPTIONS,
      traceability: TRACEABILITY_OPTIONS,
    },
  },
  productTemplate: { objectPlural: 'productTemplates', reports: { productLabels: PRODUCT_LABEL_OPTIONS } },
  productProduct: { objectPlural: 'productProducts', reports: { productLabels: PRODUCT_LABEL_OPTIONS } },
  stockLot: {
    objectPlural: 'stockLots',
    reports: { lotLabelPdf: NO_PRINT_OPTIONS, lotLabelZpl: NO_PRINT_OPTIONS, traceability: TRACEABILITY_OPTIONS },
  },
  stockMoveLine: { objectPlural: 'stockMoveLines', reports: { traceability: TRACEABILITY_OPTIONS } },
  stockPackage: {
    objectPlural: 'stockPackages',
    reports: { packageBarcodeZpl: NO_PRINT_OPTIONS, packageBarcodeContents: NO_PRINT_OPTIONS, packageBarcodeSmall: NO_PRINT_OPTIONS },
  },
  stockPackageHistory: {
    objectPlural: 'stockPackageHistories',
    reports: { packageBarcodeZpl: NO_PRINT_OPTIONS, packageBarcodeContents: NO_PRINT_OPTIONS, packageBarcodeSmall: NO_PRINT_OPTIONS },
  },
  stockPickingType: { objectPlural: 'stockPickingTypes', reports: { pickingTypeLabelZpl: NO_PRINT_OPTIONS, pickingTypeLabelPdf: NO_PRINT_OPTIONS } },
  productUom: { objectPlural: 'productUoms', reports: { packagingBarcodeZpl: NO_PRINT_OPTIONS } },
  stockQuant: { objectPlural: 'stockQuants', reports: { countSheet: NO_PRINT_OPTIONS } },
  stockLocation: { objectPlural: 'stockLocations', reports: { locationBarcode: NO_PRINT_OPTIONS } },
  stockPickingBatch: {
    objectPlural: 'stockPickingBatches',
    reports: { batchTransfer: NO_PRINT_OPTIONS, receptionReport: NO_PRINT_OPTIONS, receptionReportLabels: RECEPTION_LABEL_OPTIONS },
  },
};

// Options that name records: the print route keeps them only when the clicking user may read every one.
export const OPTION_RECORDS: Partial<Record<PrintReportKey, Record<string, { objectSingular: string; objectPlural: string }>>> = {
  productLabels: { pricelistId: { objectSingular: 'productPricelist', objectPlural: 'productPricelists' } },
  traceability: { openLineIds: { objectSingular: 'stockMoveLine', objectPlural: 'stockMoveLines' } },
  receptionReportLabels: { moveIds: { objectSingular: 'stockMove', objectPlural: 'stockMoves' } },
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
