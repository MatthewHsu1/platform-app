import { registerPrintable } from 'src/stock/printing/printables';
import { readBatchPrintData } from 'src/stock/printing/printables/read-batch-print-data';
import {
  findInOrder,
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
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';

// Every printable here reads as the app: the print page has no user. The print route has checked
// the user may read the records it names.

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
  lot { deletedAt name } package { deletedAt name completeName }`;

registerPrintable<QuantRow & { uomName: string }>({
  key: 'countSheet',
  objectSingular: 'stockQuant',
  objectPlural: 'stockQuants',
  read: async (recordIds) => {
    const [rows, uoms] = await Promise.all([findInOrder<QuantRow>(stockQuants, recordIds, QUANT_SELECTION), readResolvedUoms()]);

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
  read: (recordIds) => findInOrder<NamedBarcode>(stockLocations, recordIds, 'id name barcode'),
  build: (rows) => buildBarcodeSheet(rows.map((row) => ({ name: text(row.name), barcode: text(row.barcode) }))),
  fileName: (rows) => (rows.length === 1 ? `Location - ${text(rows[0].name)}` : 'Location Barcode'),
});

registerPrintable<NamedBarcode>({
  key: 'pickingTypeLabelPdf',
  objectSingular: 'stockPickingType',
  objectPlural: 'stockPickingTypes',
  read: (recordIds) => findInOrder<NamedBarcode>(stockPickingTypes, recordIds, 'id name barcode'),
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
    read: readPackagePrintData,
    build: report.build,
    fileName: () => report.fileName,
  });
  // A history row prints the package it is about; rows of one package print it once.
  registerPrintable<PackagePrintData>({
    key: report.key,
    objectSingular: 'stockPackageHistory',
    objectPlural: 'stockPackageHistories',
    read: async (recordIds) => readPackagePrintData(await readHistoryPackageIds(recordIds)),
    build: report.build,
    fileName: () => report.fileName,
  });
}

registerPrintable<{ pickingNames: string[]; packages: PackagePrintData[] }>({
  key: 'pickingPackages',
  objectSingular: 'stockPicking',
  objectPlural: 'stockPickings',
  read: async (recordIds) => {
    const pickings = await findInOrder<{ id: string; name: string | null }>(stockPickings, recordIds, 'id name');

    return [{ pickingNames: pickings.map((picking) => text(picking.name)), packages: await readPackagePrintData(await readPickingPackageIds(recordIds)) }];
  },
  build: (data) => buildPackageContents(data[0]?.packages ?? [], readStockSettings().productUnitDigits),
  fileName: (data) => (data[0]?.pickingNames.length === 1 ? `Packages - ${data[0].pickingNames[0]}` : 'Packages'),
});

const receptionRequest = (objectSingular: string, recordIds: string[]): ReceptionPrintRequest =>
  objectSingular === 'stockPickingBatch' ? { pickingIds: [], batchId: recordIds[0] ?? null } : { pickingIds: recordIds, batchId: null };

for (const [objectSingular, objectPlural] of [
  ['stockPicking', 'stockPickings'],
  ['stockPickingBatch', 'stockPickingBatches'],
] as const) {
  registerPrintable<ReceptionPrintData>({
    key: 'receptionReport',
    objectSingular,
    objectPlural,
    read: async (recordIds) => [await readReceptionPrintData(receptionRequest(objectSingular, recordIds))],
    build: (data, _options, context) => buildReceptionReport(data[0], context),
    fileName: () => 'Reception Report',
  });

  // From the report the labels follow what is allocated; after a receipt is validated they follow
  // the moves it feeds.
  registerPrintable<ReceptionLabel>({
    key: 'receptionReportLabels',
    objectSingular,
    objectPlural,
    read: async (recordIds, options) =>
      options.allocatedOnly === true || objectSingular === 'stockPickingBatch'
        ? readAllocatedLabels(receptionRequest(objectSingular, recordIds))
        : readDestinationLabels(recordIds),
    build: buildReceptionLabels,
    fileName: () => 'Reception Report Label',
  });
}

// The report as the user unfolded it, its rows worked out again when the page opens.
for (const [objectSingular, objectPlural] of [
  ['stockLot', 'stockLots'],
  ['stockPicking', 'stockPickings'],
  ['stockMoveLine', 'stockMoveLines'],
] as const) {
  registerPrintable<{ lines: TracePrintLine[]; reference: string }>({
    key: 'traceability',
    objectSingular,
    objectPlural,
    read: async (recordIds, options) =>
      recordIds.length === 0
        ? []
        : [
            await readTraceabilityPrintLines(
              objectSingular as TraceabilityModel,
              recordIds[0],
              Array.isArray(options.openLineIds) ? options.openLineIds.filter((id): id is string => typeof id === 'string') : [],
            ),
          ],
    build: (data, _options, context) => buildTraceabilityPdf(data[0]?.lines ?? [], data[0]?.reference ?? '', context),
    fileName: () => 'Traceability Report',
  });
}

registerPrintable<BatchPrintData>({
  key: 'batchTransfer',
  objectSingular: 'stockPickingBatch',
  objectPlural: 'stockPickingBatches',
  read: readBatchPrintData,
  build: (batches, _options, context) => buildBatchTransfer(batches, context),
  fileName: () => 'Batch Transfer',
});
