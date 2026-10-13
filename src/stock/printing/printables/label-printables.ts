import { registerPrintable } from 'src/stock/printing/printables';
import { readLotLabelRows, readProductLabelData, readTransferLotLines } from 'src/stock/printing/printables/read-label-data';
import { type LotLabelRow } from 'src/stock/printing/types/lot-label-row.type';
import { type ProductLabelData } from 'src/stock/printing/types/product-label-data.type';
import { type ProductLabelOptions } from 'src/stock/printing/types/product-label-options.type';
import { lotLabelLotIds } from 'src/stock/printing/utils/label-quantities.util';
import { lotLabelSheet } from 'src/stock/printing/utils/label-sheets.util';
import { buildProductLabels, productLabelsFileName } from 'src/stock/printing/utils/product-labels.util';
import { zplLotLabels } from 'src/stock/printing/utils/zpl.util';
import { type RowFinder } from 'src/stock/types/row-finder.type';

// The options were checked against the report's declared options when the link was made.
const productLabelOptions = (options: Record<string, unknown>) => options as ProductLabelOptions;
const labelQuantity = (options: Record<string, unknown>) => (options.labelQuantity === 'UNITS' ? 'UNITS' : 'LOTS');

for (const [objectSingular, objectPlural] of [
  ['productTemplate', 'productTemplates'],
  ['productProduct', 'productProducts'],
  ['stockPicking', 'stockPickings'],
] as const) {
  registerPrintable<ProductLabelData>({
    key: 'productLabels',
    objectSingular,
    objectPlural,
    read: async (recordIds, options, find) => [
      await readProductLabelData(find, objectSingular, recordIds, productLabelOptions(options).pricelistId ?? null),
    ],
    build: (data, options) => buildProductLabels(data[0], productLabelOptions(options), new Date()),
    fileName: (_data, options) => productLabelsFileName(productLabelOptions(options)),
  });
}

// The lot sheet prints the product's own name; the ZPL label prints the variant's full name.
const lotSheet = (rows: LotLabelRow[]) =>
  lotLabelSheet(rows.map((row) => ({ defaultCode: row.defaultCode, productName: row.templateName, lotName: row.name })));
const lotZpl = (rows: LotLabelRow[]) => ({
  kind: 'zpl' as const,
  text: zplLotLabels(rows.map((row) => ({ productDisplayName: row.productName, lotName: row.name }))),
});
// One label is named after its lot; several (even of one lot) after the report.
const lotSheetName = (rows: LotLabelRow[]) => (rows.length === 1 ? `Lot-Serial - ${rows[0].name}` : 'Lot/Serial Number (PDF)');

registerPrintable<LotLabelRow>({
  key: 'lotLabelPdf',
  objectSingular: 'stockLot',
  objectPlural: 'stockLots',
  read: (recordIds, _options, find) => readLotLabelRows(find, recordIds),
  build: lotSheet,
  fileName: lotSheetName,
});

// From a transfer: the lots on its lines, one label per lot or one per unit.
const readTransferLots = async (pickingIds: string[], options: Record<string, unknown>, find: RowFinder) =>
  readLotLabelRows(find, lotLabelLotIds({ labelQuantity: labelQuantity(options), lines: await readTransferLotLines(find, pickingIds) }));

registerPrintable<LotLabelRow>({
  key: 'lotLabelPdf',
  objectSingular: 'stockPicking',
  objectPlural: 'stockPickings',
  read: readTransferLots,
  build: lotSheet,
  fileName: lotSheetName,
});

registerPrintable<LotLabelRow>({
  key: 'lotLabelZpl',
  objectSingular: 'stockPicking',
  objectPlural: 'stockPickings',
  read: readTransferLots,
  build: lotZpl,
  fileName: () => 'Lot/Serial Number (ZPL)',
});
