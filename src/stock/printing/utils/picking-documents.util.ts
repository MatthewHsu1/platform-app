import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type PrintContext } from 'src/stock/printing/types/print-context.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';
import { dayInTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { PICKING_STATE, PICKING_STATE_OPTIONS, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';

const CODE_REPORT_NAMES: Record<PickingPrintData['pickingTypeCode'], string> = {
  OUTGOING: 'Delivery Note',
  INCOMING: 'Goods Receipt Note',
  INTERNAL: 'Internal Move',
};
const NOT_RESERVED_TEXT = 'All products could not be reserved. Click on the "Check Availability" button to try to reserve products.';
const NO_PACKAGE_TEXT = 'Products with no package assigned';
const WAITING_STATES: string[] = [PICKING_STATE.DRAFT, PICKING_STATE.WAITING, PICKING_STATE.CONFIRMED];
const PACKAGE_TABLE_STATES: string[] = [PICKING_STATE.ASSIGNED, PICKING_STATE.DONE];

type Field = [string, string];
type TableBlock = Extract<PrintBlock, { kind: 'table' }>;

const amount = (quantity: number, uomName: string) => (uomName === '' ? `${quantity}` : `${quantity} ${uomName}`);
const withPackage = (location: string, packageName: string) => (packageName === '' ? location : `${location} (${packageName})`);
const contact = (name: string, address: string) => [name, address].filter((part) => part !== '').join('\n');
const stateLabel = (state: string) => PICKING_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;
const field = (shown: boolean, label: string, value: string): Field[] => (shown ? [[label, value]] : []);
// Plain code-point order, as names sort on the server.
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const compareLocations = (left: PickingPrintLine | undefined, right: PickingPrintLine | undefined) =>
  compareText(left?.from ?? '', right?.from ?? '') || compareText(left?.to ?? '', right?.to ?? '');

const table = (columns: string[], rows: PrintTableCell[][]): TableBlock => ({
  kind: 'table',
  columns,
  rows,
  widths: columns.map((_, index) => (index === 0 ? 3 : 2)),
});

// Product barcodes print bare; lot and package barcodes carry their name under the bars.
const barcodeCell = (value: string, caption?: string): PrintTableCell =>
  value === ''
    ? ''
    : ({ kind: 'barcode', symbology: 'code128', value, ...(caption === undefined ? {} : { caption }), widthMm: 40, heightMm: 9 } satisfies BarcodeBlock);

// The transfer's own wording for a product, without the product name it often starts with.
const reportDescription = (productName: string, description: string) =>
  description.startsWith(productName) ? description.slice(productName.length).trim() : description.trim();

const productCell = (productName: string, description: string) => (description === '' ? productName : `${productName}\n${description}`);

const deliveryProductCell = (move: Pick<PickingPrintMove, 'productName' | 'descriptionPicking'>) =>
  productCell(move.productName, reportDescription(move.productName, move.descriptionPicking));

const shouldPrintDeliveryAddress = (picking: PickingPrintData) =>
  picking.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING && picking.moves.length > 0 && picking.partnerName !== '';

const pickingOperationsFields = (picking: PickingPrintData, timeZone: string): Field[] => [
  ...field(shouldPrintDeliveryAddress(picking), 'Delivery Address:', contact(picking.partnerName, picking.partnerAddress)),
  ...field(picking.origin !== '', 'Order:', picking.origin),
  ['Warehouse:', picking.warehouseName],
  ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL && picking.partnerName !== '', 'Contact', picking.partnerName),
  ['Status:', stateLabel(picking.state)],
  ...field(picking.responsibleName !== '', 'Operator:', picking.responsibleName),
  ...field(picking.state === PICKING_STATE.DONE && picking.dateDone !== null, 'Done Date:', dayInTimeZone(picking.dateDone, timeZone)),
  ...field(picking.state !== PICKING_STATE.DONE && picking.scheduledDate !== null, 'Scheduled Date:', dayInTimeZone(picking.scheduledDate, timeZone)),
  ...field(picking.warningText !== '', 'Instructions:', picking.warningText.trim()),
  ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INCOMING && picking.partnerName !== '', 'Vendor:', picking.partnerName),
];

const operationsTable = (picking: PickingPrintData): TableBlock | null => {
  const showFrom = picking.pickingTypeCode !== PICKING_TYPE_CODE.INCOMING;
  const showTo = picking.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING;
  const allLines = picking.moves.flatMap((move) => move.lines);
  const showBarcode =
    picking.moves.some((move) => move.productBarcode !== '' && move.lines.length > 0) || allLines.some((line) => line.lotName !== '');
  const moves = picking.moves
    .filter((move) => move.quantity !== 0 && move.lines.some((line) => !line.isEntirePack))
    .sort((left, right) => compareLocations(left.lines[0], right.lines[0]));

  if (!allLines.some((line) => !line.isEntirePack)) {
    return null;
  }
  const cells = (from: string, to: string, barcode: PrintTableCell): PrintTableCell[] => [
    ...(showFrom ? [from] : []),
    ...(showTo ? [to] : []),
    ...(showBarcode ? [barcode] : []),
  ];
  const rows: PrintTableCell[][] = [];

  for (const move of moves) {
    const lines = move.lines.filter((line) => !line.isEntirePack);
    // One untracked line is summed up on the move's row; otherwise each line gets its own row.
    const hasLineRows = move.lines.length > 1 || lines.some((line) => line.lotName !== '');
    const [first] = move.lines;
    const description = move.descriptionPicking !== '' && move.descriptionPicking !== move.productName ? move.descriptionPicking : '';
    const packaging =
      move.packagingUomName !== null && move.packagingUomName !== move.uomName
        ? ` (${Math.round(move.packagingQty)} ${move.packagingUomName})`
        : '';

    rows.push([
      productCell(move.productName, description),
      `${amount(move.quantity, move.uomName)}${packaging}`,
      ...cells(
        hasLineRows ? '' : withPackage(first.from, first.packageName),
        hasLineRows ? '' : withPackage(first.to, first.resultPackageName),
        barcodeCell(move.productBarcode),
      ),
    ]);
    if (hasLineRows) {
      for (const line of [...lines].sort(compareLocations)) {
        rows.push([
          line.lotName === '' ? '' : `    ${line.lotName}`,
          amount(line.quantity, line.uomName),
          ...cells(withPackage(line.from, line.packageName), withPackage(line.to, line.resultPackageName), barcodeCell(line.lotBarcode, line.lotBarcode)),
        ]);
      }
    }
  }

  return table(['Product', 'Quantity', ...(showFrom ? ['From'] : []), ...(showTo ? ['To'] : []), ...(showBarcode ? ['Barcode'] : [])], rows);
};

// Packages moved whole are listed by package, not by product.
const packagesTable = (picking: PickingPrintData): TableBlock | null => {
  const entireLines = picking.moves.flatMap((move) => move.lines).filter((line) => line.isEntirePack);

  if (entireLines.length === 0 || !PACKAGE_TABLE_STATES.includes(picking.state)) {
    return null;
  }
  const showFrom = picking.pickingTypeCode !== PICKING_TYPE_CODE.INCOMING;
  const showTo = picking.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING;
  const byPackage = new Map<string, PickingPrintLine>();

  for (const line of entireLines) {
    if (!byPackage.has(line.packageName)) {
      byPackage.set(line.packageName, line);
    }
  }
  const rows = [...byPackage.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([packageName, line]) => [
      barcodeCell(packageName, packageName),
      ...(showFrom ? [line.from] : []),
      ...(showTo ? [withPackage(line.to, line.resultPackageName === packageName ? '' : line.resultPackageName)] : []),
    ]);

  return table(['Package', ...(showFrom ? ['From'] : []), ...(showTo ? ['To'] : [])], rows);
};

const isNotReserved = (picking: PickingPrintData) =>
  WAITING_STATES.includes(picking.state) ||
  (picking.state !== PICKING_STATE.DONE && picking.moves.some((move) => move.demand > move.quantity && move.lines.length > 0));

const pickingOperationsBlocks = (picking: PickingPrintData, timeZone: string): PrintBlock[] => {
  const operations = operationsTable(picking);
  const packages = packagesTable(picking);

  return [
    { kind: 'title', text: picking.name },
    { kind: 'barcode', symbology: 'code128', value: picking.name, widthMm: 60, heightMm: 12 },
    { kind: 'fields', rows: pickingOperationsFields(picking, timeZone) },
    ...(operations === null ? [] : [operations]),
    ...(packages === null ? [] : [packages]),
    ...(isNotReserved(picking) ? [{ kind: 'text' as const, text: NOT_RESERVED_TEXT }] : []),
    ...(picking.note === '' ? [] : [{ kind: 'text' as const, text: picking.note }]),
  ];
};

const deliverySlipFields = (picking: PickingPrintData, timeZone: string): Field[] => {
  const address: Field[] = shouldPrintDeliveryAddress(picking)
    ? [['Delivery Address', contact(picking.partnerName, picking.partnerAddress)]]
    : field(
        picking.pickingTypeCode !== PICKING_TYPE_CODE.INTERNAL && picking.warehouseAddress !== '',
        'Warehouse Address',
        picking.warehouseAddress,
      );
  const isDone = picking.state === PICKING_STATE.DONE;

  return [
    ...address,
    ...field(
      picking.pickingTypeCode === PICKING_TYPE_CODE.INCOMING && picking.partnerName !== '',
      'Vendor Address',
      contact(picking.partnerName, picking.partnerAddress),
    ),
    ...field(picking.origin !== '', 'Order', picking.origin),
    ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL && picking.partnerName !== '', 'Contact', picking.partnerName),
    ['Shipping Date', dayInTimeZone(isDone ? picking.dateDone : picking.scheduledDate, timeZone)],
    ...field(picking.responsibleName !== '', 'Operator:', picking.responsibleName),
  ];
};

type DoneLine = { move: PickingPrintMove; line: PickingPrintLine };
type AggregatedLine = { product: string; uomName: string; ordered: number; delivered: number };

const aggregationKey = (move: Pick<PickingPrintMove, 'productName' | 'descriptionPicking' | 'uomName'>) =>
  JSON.stringify([move.productName, reportDescription(move.productName, move.descriptionPicking), move.uomName]);

// One line per product, description and unit. Without packages, what was ordered also counts
// the demand that went on to backorders, and moves cancelled without any delivery.
const aggregateLines = (
  doneLines: DoneLine[],
  options: { strict: true } | { strict: false; picking: PickingPrintData },
): AggregatedLine[] => {
  const aggregated = new Map<string, AggregatedLine>();

  for (const { move, line } of doneLines) {
    const key = aggregationKey(move);
    const existing = aggregated.get(key);

    if (existing !== undefined) {
      existing.ordered += line.quantity;
      existing.delivered += line.quantity;
      continue;
    }
    const orderedLater = options.strict
      ? 0
      : options.picking.backorderChainMoves
          .filter((backorderMove: PickingPrintBackorderMove) => aggregationKey(backorderMove) === key)
          .reduce((sum, backorderMove) => sum + backorderMove.demand, 0);
    const otherLines = move.lines.filter((other) => other !== line).reduce((sum, other) => sum + other.quantity, 0);

    aggregated.set(key, {
      product: deliveryProductCell(move),
      uomName: move.uomName,
      ordered: options.strict ? line.quantity : move.demand + orderedLater - otherLines,
      delivered: line.quantity,
    });
  }
  if (!options.strict) {
    for (const move of options.picking.moves) {
      const key = aggregationKey(move);

      if (move.demand !== 0 && move.quantity === 0 && move.lines.length === 0 && !aggregated.has(key)) {
        aggregated.set(key, { product: deliveryProductCell(move), uomName: move.uomName, ordered: move.demand, delivered: 0 });
      }
    }
  }

  return [...aggregated.values()];
};

const doneTable = (picking: PickingPrintData, timeZone: string): TableBlock | null => {
  const doneLines: DoneLine[] = picking.moves.flatMap((move) => move.lines.map((line) => ({ move, line })));

  if (doneLines.length === 0) {
    return null;
  }
  const hasLots = doneLines.some(({ line }) => line.lotName !== '');
  const hasExpiry = hasLots && doneLines.some(({ line }) => line.expirationDate !== null);
  const columns = ['Product', hasLots ? 'Lot/Serial Number' : 'Ordered', ...(hasExpiry ? ['Expiration Date'] : []), 'Delivered'];
  const lotRow = ({ move, line }: DoneLine) => [
    deliveryProductCell(move),
    line.lotName,
    ...(hasExpiry ? [dayInTimeZone(line.expirationDate, timeZone)] : []),
    amount(line.quantity, line.uomName),
  ];
  const aggregatedRow = (aggregated: AggregatedLine) => [
    aggregated.product,
    amount(aggregated.ordered, aggregated.uomName),
    amount(aggregated.delivered, aggregated.uomName),
  ];
  const sectionRow = (title: string) => [title, ...columns.slice(1).map(() => '')];
  const packageNames = [...new Set(doneLines.map(({ line }) => line.resultPackageName).filter((name) => name !== ''))];

  if (packageNames.length === 0) {
    return table(columns, hasLots ? doneLines.map(lotRow) : aggregateLines(doneLines, { strict: false, picking }).map(aggregatedRow));
  }
  const rows: PrintTableCell[][] = [];

  for (const packageName of packageNames) {
    const inPackage = doneLines
      .filter(({ line }) => line.resultPackageName === packageName)
      .sort((left, right) => compareText(left.line.productName, right.line.productName));

    rows.push(sectionRow(packageName));
    rows.push(...(hasLots ? inPackage.map(lotRow) : aggregateLines(inPackage, { strict: true }).map(aggregatedRow)));
  }
  const unpacked = doneLines.filter(({ line }) => line.resultPackageName === '');
  const unpackedRows = hasLots ? unpacked.map(lotRow) : aggregateLines(unpacked, { strict: false, picking }).map(aggregatedRow);

  if (unpackedRows.length > 0) {
    rows.push(sectionRow(NO_PACKAGE_TEXT), ...unpackedRows);
  }

  return table(columns, rows);
};

const deliverySlipBlocks = (picking: PickingPrintData, timeZone: string): PrintBlock[] => {
  const lines =
    picking.state === PICKING_STATE.DONE
      ? doneTable(picking, timeZone)
      : table(
          ['Product', 'Ordered', 'Delivered'],
          picking.moves
            .filter((move) => move.demand !== 0)
            .map((move) => {
              const packaging =
                move.packagingUomName !== null && move.packagingUomName !== move.uomName
                  ? `\n${move.packagingQty} ${move.packagingUomName}`
                  : '';

              return [deliveryProductCell(move), `${amount(move.demand, move.uomName)}${packaging}`, amount(move.quantity, move.uomName)];
            }),
        );
  const remaining = picking.backorderMoves.filter((move) => move.demand !== 0);

  return [
    { kind: 'title', text: `${CODE_REPORT_NAMES[picking.pickingTypeCode]} ${picking.name}` },
    { kind: 'fields', rows: deliverySlipFields(picking, timeZone) },
    ...(lines === null ? [] : [lines]),
    ...(remaining.length > 0
      ? [
          { kind: 'text' as const, text: 'Remaining quantities not yet delivered:' },
          table(
            ['Product', 'Quantity'],
            remaining.map((move) => [deliveryProductCell(move), amount(move.demand, move.uomName)]),
          ),
        ]
      : []),
    ...(picking.signaturePng !== null
      ? [
          { kind: 'heading' as const, text: 'Signature' },
          { kind: 'image' as const, png: picking.signaturePng, widthMm: 60 },
          ...(picking.partnerName === '' ? [] : [{ kind: 'text' as const, text: picking.partnerName }]),
        ]
      : []),
  ];
};

const returnSlipBlocks = (picking: PickingPrintData): PrintBlock[] => [
  { kind: 'title', text: `RETURN OF ${picking.name}` },
  { kind: 'text', text: 'Please put this document inside your return parcel.' },
  { kind: 'text', text: 'Your parcel must be sent to this address:' },
  {
    kind: 'text',
    text:
      picking.pickingTypeCode === PICKING_TYPE_CODE.INCOMING
        ? contact(picking.partnerName, picking.partnerAddress)
        : picking.sourceWarehouseAddress,
  },
  { kind: 'barcode', symbology: 'code128', value: picking.name, caption: picking.name, widthMm: 60, heightMm: 12 },
  { kind: 'barcode', symbology: 'code128', value: 'OBTRETU', caption: 'OBTRETU', widthMm: 60, heightMm: 12 },
];

// Several transfers print one after the other, each from a new page.
const perPicking = (
  pickings: PickingPrintData[],
  context: PrintContext,
  blocksOf: (picking: PickingPrintData, timeZone: string) => PrintBlock[],
): PrintDocument => ({
  kind: 'document',
  blocks: pickings.flatMap((picking, index) => [
    ...(index > 0 ? [{ kind: 'pageBreak' as const }] : []),
    ...blocksOf(picking, context.timeZone),
  ]),
});

export const buildPickingOperations = (pickings: PickingPrintData[], _options: Record<string, unknown>, context: PrintContext) =>
  perPicking(pickings, context, pickingOperationsBlocks);
export const buildDeliverySlip = (pickings: PickingPrintData[], _options: Record<string, unknown>, context: PrintContext) =>
  perPicking(pickings, context, deliverySlipBlocks);
export const buildReturnSlip = (pickings: PickingPrintData[], _options: Record<string, unknown>, context: PrintContext) =>
  perPicking(pickings, context, returnSlipBlocks);
