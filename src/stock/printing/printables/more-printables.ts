import { findInOrder } from 'src/stock/printing/print-rows';
import { registerPrintable } from 'src/stock/printing/printables';
import { PRINT_MESSAGES } from 'src/stock/printing/print-messages.constant';
import { readBatchPrintData } from 'src/stock/printing/printables/read-batch-print-data';
import {
  readHistoryPackageIds,
  readPackagePrintData,
  readPickingPackageIds,
} from 'src/stock/printing/printables/read-package-print-data';
import {
  readAllocatedLabels,
  readDestinationLabels,
  readReceptionPrintData,
} from 'src/stock/printing/printables/read-reception-print-data';
import { readTraceabilityPrintLines } from 'src/stock/printing/printables/read-traceability-print-lines';
import { type BatchPrintData } from 'src/stock/printing/types/batch-print-data.type';
import { type PackagePrintData } from 'src/stock/printing/types/package-print-data.type';
import { type ReceptionLabel } from 'src/stock/printing/types/reception-label.type';
import { type ReceptionPrintData } from 'src/stock/printing/types/reception-print-data.type';
import { type ReceptionPrintRequest } from 'src/stock/printing/types/reception-print-request.type';
import { type TracePrintLine } from 'src/stock/printing/types/trace-print-line.type';
import {
  buildBarcodeSheet,
  buildBatchTransfer,
  buildCountSheet,
  buildPackageContents,
  buildPackageSmall,
  buildReceptionLabels,
  buildReceptionReport,
  buildTraceabilityPdf,
} from 'src/stock/printing/utils/more-documents.util';
import { stockLocations, stockPickings, stockPickingTypes, stockQuants } from 'src/stock/stock-records';
import { StockUserError } from 'src/stock/stock-errors';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';


const text = (value: string | null | undefined) => value ?? '';

type QuantRow = {
  id: string;
  quantity: number | null;
  location: { completeName: string | null } | null;
  product: { name: string | null; productTmpl: { uomId: string | null } | null } | null;
  lot: { name: string | null } | null;
  package: { name: string | null; completeName: string | null } | null;
};

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const QUANT_SELECTION = `id quantity location { deletedAt completeName } product { deletedAt name productTmpl { deletedAt uomId } }
  lot { id deletedAt name } package { id deletedAt name completeName }`;

registerPrintable<QuantRow & { uomName: string }>({
  key: 'countSheet',
  objectSingular: 'stockQuant',
  objectPlural: 'stockQuants',
  read: async (recordIds, _options, find) => {
    const [rows, uoms] = await Promise.all([findInOrder<QuantRow>(find, stockQuants, recordIds, QUANT_SELECTION), readResolvedUoms()]);

    return rows.map((row) => ({ ...row, uomName: uoms.get(row.product?.productTmpl?.uomId ?? '')?.name ?? '' }));
  },
  build: (rows) => {
    const settings = readStockSettings();

    return buildCountSheet(
      rows.map((row) => ({
        locationName: text(row.location?.completeName),
        productName: text(row.product?.name),
        lotName: text(row.lot?.name),
        packageName: text(row.package?.completeName) || text(row.package?.name),
        quantity: row.quantity ?? 0,
        uomName: row.uomName,
      })),
      settings.showExpectedQuantityCount,
      settings.productUnitDigits,
    );
  },
  fileName: () => 'Count Sheet',
});

type NamedBarcode = { id: string; name: string | null; barcode: string | null };

registerPrintable<NamedBarcode>({
  key: 'locationBarcode',
  objectSingular: 'stockLocation',
  objectPlural: 'stockLocations',
  read: (recordIds, _options, find) => findInOrder<NamedBarcode>(find, stockLocations, recordIds, 'name barcode'),
  build: (rows) => buildBarcodeSheet(rows.map((row) => ({ name: text(row.name), barcode: text(row.barcode) }))),
  fileName: (rows) => (rows.length === 1 ? `Location - ${text(rows[0].name)}` : 'Location Barcode'),
});

registerPrintable<NamedBarcode>({
  key: 'pickingTypeLabelPdf',
  objectSingular: 'stockPickingType',
  objectPlural: 'stockPickingTypes',
  read: (recordIds, _options, find) => findInOrder<NamedBarcode>(find, stockPickingTypes, recordIds, 'name barcode'),
  build: (rows) => buildBarcodeSheet(rows.map((row) => ({ name: text(row.name), barcode: text(row.barcode) }))),
  fileName: (rows) => (rows.length === 1 ? `Operation-type - ${text(rows[0].name)}` : 'Operation type (PDF)'),
});

const PACKAGE_REPORTS = [
  { key: 'packageBarcodeContents', build: (rows: PackagePrintData[]) => buildPackageContents(rows, readStockSettings().productUnitDigits), fileName: 'Package Barcode with Contents' },
  { key: 'packageBarcodeSmall', build: buildPackageSmall, fileName: 'Package Barcode (PDF)' },
] as const;

for (const report of PACKAGE_REPORTS) {
  registerPrintable<PackagePrintData>({
    key: report.key,
    objectSingular: 'stockPackage',
    objectPlural: 'stockPackages',
    read: (recordIds, _options, find) => readPackagePrintData(find, recordIds),
    build: report.build,
    fileName: () => report.fileName,
  });
  // A history row prints the package it is about; rows of one package print it once.
  registerPrintable<PackagePrintData>({
    key: report.key,
    objectSingular: 'stockPackageHistory',
    objectPlural: 'stockPackageHistories',
    read: async (recordIds, _options, find) => readPackagePrintData(find, await readHistoryPackageIds(find, recordIds)),
    build: report.build,
    fileName: () => report.fileName,
  });
}

registerPrintable<{ pickingNames: string[]; packages: PackagePrintData[] }>({
  key: 'pickingPackages',
  objectSingular: 'stockPicking',
  objectPlural: 'stockPickings',
  read: async (recordIds, _options, find) => {
    const pickings = await findInOrder<{ id: string; name: string | null }>(find, stockPickings, recordIds, 'name');
    const packages = await readPackagePrintData(find, await readPickingPackageIds(find, recordIds));

    return [{ pickingNames: pickings.map((picking) => text(picking.name)), packages }];
  },
  build: (data) => buildPackageContents(data[0]?.packages ?? [], readStockSettings().productUnitDigits),
  fileName: (data) => (data[0]?.pickingNames.length === 1 ? `Packages - ${data[0].pickingNames[0]}` : 'Packages'),
});

// A report of one record (a batch's reception, a traceability tree) refuses several.
const oneRecord = (recordIds: string[]) => {
  if (recordIds.length !== 1) {
    throw new StockUserError(PRINT_MESSAGES.oneRecordOnly);
  }
  return recordIds[0];
};

const receptionRequest = (objectSingular: string, recordIds: string[]): ReceptionPrintRequest =>
  objectSingular === 'stockPickingBatch' ? { pickingIds: [], batchId: oneRecord(recordIds) } : { pickingIds: recordIds, batchId: null };

const idList = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : null);

for (const [objectSingular, objectPlural] of [
  ['stockPicking', 'stockPickings'],
  ['stockPickingBatch', 'stockPickingBatches'],
] as const) {
  registerPrintable<ReceptionPrintData>({
    key: 'receptionReport',
    objectSingular,
    objectPlural,
    read: async (recordIds, _options, find) => [await readReceptionPrintData(find, receptionRequest(objectSingular, recordIds))],
    build: (data, _options, context) => buildReceptionReport(data[0], context),
    fileName: () => 'Reception Report',
  });

  // From the report the labels follow what is allocated (all of it, one delivery's or one line's
  // delivery moves); after a receipt is validated they follow the moves it feeds.
  registerPrintable<ReceptionLabel>({
    key: 'receptionReportLabels',
    objectSingular,
    objectPlural,
    read: async (recordIds, options, find) =>
      options.allocatedOnly === true || objectSingular === 'stockPickingBatch'
        ? readAllocatedLabels(find, receptionRequest(objectSingular, recordIds), idList(options.moveIds))
        : readDestinationLabels(find, recordIds),
    build: buildReceptionLabels,
    fileName: () => 'Reception Report Label',
  });
}

// The report as the user unfolded it, its rows worked out again through the print's reader.
for (const [objectSingular, objectPlural] of [
  ['stockLot', 'stockLots'],
  ['stockPicking', 'stockPickings'],
  ['stockMoveLine', 'stockMoveLines'],
] as const) {
  registerPrintable<{ lines: TracePrintLine[]; reference: string }>({
    key: 'traceability',
    objectSingular,
    objectPlural,
    read: async (recordIds, options, find) => [
      await readTraceabilityPrintLines(find, objectSingular as TraceabilityModel, oneRecord(recordIds), idList(options.openLineIds) ?? []),
    ],
    build: (data, _options, context) => buildTraceabilityPdf(data[0]?.lines ?? [], data[0]?.reference ?? '', context),
    fileName: () => 'Traceability Report',
  });
}

registerPrintable<BatchPrintData>({
  key: 'batchTransfer',
  objectSingular: 'stockPickingBatch',
  objectPlural: 'stockPickingBatches',
  read: (recordIds, _options, find) => readBatchPrintData(find, recordIds),
  build: (batches, _options, context) => buildBatchTransfer(batches, context),
  fileName: () => 'Batch Transfer',
});
