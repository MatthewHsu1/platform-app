import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type BatchPrintData } from 'src/stock/printing/types/batch-print-data.type';
import { type CountSheetQuant } from 'src/stock/printing/types/count-sheet-quant.type';
import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { type PackagePrintData } from 'src/stock/printing/types/package-print-data.type';
import { type PackageQuantRow } from 'src/stock/printing/types/package-quant-row.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type PrintContext } from 'src/stock/printing/types/print-context.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';
import { type ReceptionLabel } from 'src/stock/printing/types/reception-label.type';
import { type ReceptionPrintData } from 'src/stock/printing/types/reception-print-data.type';
import { type TracePrintLine } from 'src/stock/printing/types/trace-print-line.type';
import { isCode128Text, productBarcodeSymbology } from 'src/stock/printing/utils/picking-documents.util';
import { dateTimeInTimeZone, dayInTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { PICKING_STATE_OPTIONS } from 'src/stock/stock-options.constant';

type TableBlock = Extract<PrintBlock, { kind: 'table' }>;

const stateLabel = (state: string) => PICKING_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;

// A quantity field prints at the unit decimals, grouped by thousands.
const decimals = (quantity: number, digits: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(quantity);

// Totals print as a plain number: a whole number keeps one decimal ("4.0").
const plainNumber = (quantity: number) => (Number.isInteger(quantity) ? quantity.toFixed(1) : String(quantity));

const withUnit = (amount: string, uomName: string) => (uomName === '' ? amount : `${amount} ${uomName}`);

// Names print as Code 128; a barcode field set to "auto" prints as EAN when its digits fit. A value
// Code 128 cannot hold prints as text in its place.
const barcode = (value: string, widthMm: number, heightMm: number, caption?: string, isAuto = false): PrintBlock => {
  const symbology = isAuto ? productBarcodeSymbology(value) : 'code128';

  return symbology === 'code128' && !isCode128Text(value)
    ? { kind: 'text', text: caption ?? value }
    : { kind: 'barcode', symbology, value, ...(caption === undefined ? {} : { caption }), widthMm, heightMm };
};

const barcodeCell = (value: string, widthMm: number, heightMm: number, caption?: string, isAuto = false): PrintTableCell => {
  if (value === '') {
    return '';
  }
  const block = barcode(value, widthMm, heightMm, caption, isAuto);

  return block.kind === 'barcode' ? block : (caption ?? value);
};

const qrCell = (value: string, sizeMm: number): PrintTableCell =>
  value === '' ? '' : ({ kind: 'barcode', symbology: 'qrcode', value, widthMm: sizeMm, heightMm: sizeMm } satisfies BarcodeBlock);

const onePerPage = <TItem>(items: TItem[], blocks: (item: TItem) => PrintBlock[]): PrintBlock[] =>
  items.flatMap((item, index) => [...(index > 0 ? [{ kind: 'pageBreak' as const }] : []), ...blocks(item)]);

const distinct = <TValue>(values: TValue[]) => [...new Set(values)];

// The counted quantity is left blank, so staff write in what they count, unless the setting
// asks for the expected quantity.
export const buildCountSheet = (quants: CountSheetQuant[], showExpected: boolean, digits: number): PrintDocument => {
  const rows = distinct(quants.map((quant) => quant.locationName)).flatMap((location) => [
    [location, '', '', '', ''],
    ...quants
      .filter((quant) => quant.locationName === location)
      .map((quant) => [
        '',
        quant.productName,
        quant.lotName,
        quant.packageName,
        showExpected ? withUnit(decimals(quant.quantity, digits), quant.uomName) : quant.uomName,
      ]),
  ]);

  return {
    kind: 'document',
    blocks: [
      { kind: 'title', text: 'Inventory Count Sheet' },
      { kind: 'table', columns: ['Location', 'Product', 'Lot/Serial Number', 'Package', 'Quantity'], rows, widths: [3, 3, 2, 2, 2] },
    ],
  };
};

// A 4 x 7 sheet of names, each with its barcode and number under it when it has one.
export const buildBarcodeSheet = (items: { name: string; barcode: string }[]): LabelSheet => ({
  kind: 'labels',
  columns: 4,
  rows: 7,
  cellWidthMm: 47,
  cellHeightMm: 37.1,
  pageWidthMm: 210,
  pageHeightMm: 297,
  cells: items.map((item) => [
    { kind: 'heading' as const, text: item.name },
    ...(item.barcode === '' ? [] : [barcode(item.barcode, 47, 11, item.barcode, true)]),
  ]),
});

// Rows grouped by product in the order they come; each lot listed under its product when the
// product has between 1 and 49 lots. Rows at zero are left out.
const contentTable = (quants: PackageQuantRow[], digits: number): TableBlock => {
  const held = quants.filter((quant) => quant.quantity !== 0);
  const rows = distinct(held.map((quant) => quant.productId)).flatMap((productId) => {
    const ofProduct = held.filter((quant) => quant.productId === productId);
    const [first] = ofProduct;
    const lotCount = distinct(ofProduct.flatMap((quant) => (quant.lotName === '' ? [] : [quant.lotName]))).length;
    const total = ofProduct.reduce((sum, quant) => sum + quant.quantity, 0);

    return [
      [barcodeCell(first.productBarcode, 50, 13, first.productBarcode), first.productName, withUnit(plainNumber(total), first.uomName), ''],
      ...(lotCount > 0 && lotCount < 50
        ? ofProduct.map((quant) => ['', `    ${quant.lotName}`, withUnit(decimals(quant.quantity, digits), quant.uomName), qrCell(quant.lotName, 14)])
        : []),
    ];
  });

  return { kind: 'table', columns: ['Barcode', 'Product', 'Quantity', 'Contents'], rows, widths: [3, 3, 2, 2] };
};

const packageFields = (pack: PackagePrintData): PrintBlock[] => {
  const rows: [string, string][] = [
    ...(pack.packDate === null || pack.packDate === '' ? [] : [['Pack Date:', pack.packDate] as [string, string]]),
    ...(pack.packageTypeName === '' ? [] : [['Package Type:', pack.packageTypeName] as [string, string]]),
  ];

  return rows.length === 0 ? [] : [{ kind: 'fields', rows }];
};

const packageHeader = (name: string, kind: 'title' | 'heading'): PrintBlock[] => [{ kind, text: name }, barcode(name, 79, 13, name)];

export const buildPackageContents = (packages: PackagePrintData[], digits: number): PrintDocument => ({
  kind: 'document',
  blocks: onePerPage(packages, (pack) => [
    ...packageHeader(pack.name, 'title'),
    ...packageFields(pack),
    ...pack.children.flatMap((child) => [...packageHeader(child.name, 'heading'), contentTable(child.quants, digits)]),
    ...(pack.directQuantCount === 0
      ? []
      : [
          ...(pack.directQuantCount === pack.containedQuantCount ? [] : [{ kind: 'heading' as const, text: 'No assigned package' }]),
          contentTable(pack.quants, digits),
        ]),
  ]),
});

export const buildPackageSmall = (packages: PackagePrintData[]): PrintDocument => ({
  kind: 'document',
  blocks: onePerPage(packages, (pack) => [
    barcode(pack.name, 159, 26),
    { kind: 'heading', text: pack.name },
    ...(pack.packDate === null || pack.packDate === '' ? [] : [{ kind: 'text' as const, text: `Pack Date: ${pack.packDate}` }]),
    ...(pack.packageTypeName === '' ? [] : [{ kind: 'text' as const, text: `Package Type: ${pack.packageTypeName}` }]),
  ]),
});

// The transfers asked for (or why the report cannot run), then each delivery with the goods
// already allocated to it. Lines not yet allocated are not printed.
export const buildReceptionReport = (data: ReceptionPrintData, context: PrintContext): PrintDocument => {
  const header: PrintBlock[] =
    data.reason === null
      ? data.docs.flatMap((doc): PrintBlock[] => [
          { kind: 'heading', text: doc.name },
          barcode(doc.name, 79, 13),
          { kind: 'text', text: stateLabel(doc.state) },
        ])
      : [{ kind: 'text', text: data.reason }];
  const sources = data.sources.flatMap((source): PrintBlock[] => {
    const assigned = source.lines.filter((line) => line.isAssigned);

    if (assigned.length === 0) {
      return [];
    }
    const name = source.partnerName === '' ? source.name : `${source.name}: ${source.partnerName}`;

    return [
      barcode(source.name, 53, 8),
      {
        kind: 'table',
        columns: [name, `Expected Delivery: ${dayInTimeZone(source.scheduledDate, context.timeZone)}`],
        rows: assigned.map((line) => [line.productName, withUnit(plainNumber(line.quantity), line.uomName)]),
        widths: [3, 2],
      },
    ];
  });

  return {
    kind: 'document',
    blocks: [...header, ...(data.sources.length === 0 ? [{ kind: 'text' as const, text: 'No allocation need found.' }] : sources)],
  };
};

// Dymo labels, one per unit of each move's demand.
export const buildReceptionLabels = (labels: ReceptionLabel[]): LabelSheet => ({
  kind: 'labels',
  columns: 1,
  rows: 1,
  cellWidthMm: 57,
  cellHeightMm: 32,
  pageWidthMm: 57,
  pageHeightMm: 32,
  cells: labels.flatMap((label) =>
    Array.from({ length: Math.max(0, Math.ceil(label.demand)) }, () => [
      { kind: 'text' as const, text: label.productDisplayName },
      ...(label.sourceName === '' ? [] : [{ kind: 'text' as const, text: label.sourceName }]),
      ...label.partnerAddress
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => ({ kind: 'text' as const, text: line })),
    ]),
  ),
});

const INDENT = '  ';

export const buildTraceabilityPdf = (lines: TracePrintLine[], reference: string, context: PrintContext): PrintDocument => ({
  kind: 'document',
  landscape: true,
  blocks: [
    { kind: 'title', text: 'Traceability Report' },
    ...(reference === '' ? [] : [{ kind: 'text' as const, text: `Reference: ${reference}` }]),
    {
      kind: 'table',
      columns: ['Reference', 'Product', 'Date', 'Lot/Serial #', 'From', 'To', 'Quantity'],
      rows: lines.map(({ row, level }) => [
        `${INDENT.repeat(Math.max(0, level - 1))}${row.reference}`,
        row.productName,
        dateTimeInTimeZone(row.date, context.timeZone),
        row.lotName,
        row.from,
        row.to,
        row.quantity,
      ]),
      widths: [2, 3, 2, 2, 3, 3, 2],
    },
  ],
});

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const responsible = (name: string): PrintBlock[] => (name === '' ? [] : [{ kind: 'fields', rows: [['Responsible:', name]] }]);

// A summary page of the batch's transfers, then its lines grouped from each source location
// (by full name) to each destination, in the order the lines come.
export const buildBatchTransfer = (batches: BatchPrintData[], context: PrintContext): PrintDocument => ({
  kind: 'document',
  blocks: onePerPage(batches, (batch) => {
    const hasLot = batch.lines.some((line) => line.lotName !== '');
    const hasBarcode = batch.lines.some((line) => line.productBarcode !== '');
    const hasPackage = batch.lines.some((line) => line.resultPackageName !== '');
    const columns = [
      'Product',
      'Quantity',
      'Transfer',
      ...(hasLot ? ['Lot/Serial Number'] : []),
      ...(hasBarcode ? ['Product Barcode'] : []),
      ...(hasPackage ? ['Package'] : []),
    ];
    const sources = distinct(batch.lines.map((line) => line.locationName)).sort(compareText);

    return [
      { kind: 'title', text: `Summary: ${batch.name}` },
      barcode(batch.name, 79, 13),
      ...responsible(batch.responsibleName),
      {
        kind: 'table',
        columns: ['Transfer', 'Barcode', 'Status', 'Scheduled Date'],
        rows: [...batch.pickings]
          .sort((left, right) => left.batchSequence - right.batchSequence)
          .map((picking) => [
            picking.name,
            barcodeCell(picking.name, 53, 13),
            stateLabel(picking.state),
            dateTimeInTimeZone(picking.scheduledDate, context.timeZone),
          ]),
        widths: [3, 3, 2, 2],
      },
      { kind: 'pageBreak' },
      { kind: 'heading', text: batch.name },
      ...responsible(batch.responsibleName),
      ...sources.flatMap((source) => {
        const fromSource = batch.lines.filter((line) => line.locationName === source);

        return distinct(fromSource.map((line) => line.locationDestName)).flatMap((destination): PrintBlock[] => [
          { kind: 'text', text: `FROM ${source} TO ${destination}` },
          {
            kind: 'table',
            columns,
            rows: fromSource
              .filter((line) => line.locationDestName === destination)
              .map((line) => [
                line.productName,
                withUnit(plainNumber(line.quantity), line.uomName),
                line.pickingName,
                ...(hasLot ? [barcodeCell(line.lotName, 40, 9, line.lotName)] : []),
                ...(hasBarcode ? [barcodeCell(line.productBarcode, 40, 9, undefined, true)] : []),
                ...(hasPackage ? [line.resultPackageName === '' ? line.packageName : `${line.packageName} → ${line.resultPackageName}`] : []),
              ]),
            widths: columns.map((_, index) => (index === 0 ? 3 : 2)),
          },
        ]);
      }),
    ];
  }),
});
