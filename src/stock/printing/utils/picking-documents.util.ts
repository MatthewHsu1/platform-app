import { floatRound } from 'src/shared/utils/float-round.util';
import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type PickingPrintPackageHistory } from 'src/stock/printing/types/picking-print-package-history.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type PrintContext } from 'src/stock/printing/types/print-context.type';
import { type PrintDocument } from 'src/stock/printing/types/print-document.type';
import { type PrintTableCell } from 'src/stock/printing/types/print-table-cell.type';
import { dateTimeInTimeZone, dayInTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { MOVE_STATE, PICKING_STATE, PICKING_STATE_OPTIONS, PICKING_TYPE_CODE, PICKING_TYPE_CODE_OPTIONS } from 'src/stock/stock-options.constant';

const CODE_REPORT_NAMES: Record<PickingPrintData['pickingTypeCode'], string> = {
  OUTGOING: 'Delivery Note',
  INCOMING: 'Goods Receipt Note',
  INTERNAL: 'Internal Move',
};
const NOT_RESERVED_TEXT = 'All products could not be reserved. Click on the "Check Availability" button to try to reserve products.';
const NO_PACKAGE_TEXT = 'Products with no package assigned';
const SIGNATURE_FAILED_TEXT = 'The signature could not be loaded.';
const WAITING_STATES: string[] = [PICKING_STATE.DRAFT, PICKING_STATE.WAITING, PICKING_STATE.CONFIRMED];
const PACKAGE_TABLE_STATES: string[] = [PICKING_STATE.ASSIGNED, PICKING_STATE.DONE];
const CLOSED_STATES: string[] = [PICKING_STATE.DONE, PICKING_STATE.CANCEL];

type Field = [string, string];
type TableBlock = Extract<PrintBlock, { kind: 'table' }>;
type DoneLine = { move: PickingPrintMove; line: PickingPrintLine };
type Aggregated = {
  baseKey: string;
  packageId: string | null;
  packageName: string;
  packageHistoryId: string | null;
  product: string;
  uomName: string;
  packagingUomName: string | null;
  packagingFactor: number | null;
  ordered: number;
  delivered: number;
};
// What a move contributes to the merged lines, whether it is on the printed transfer or a backorder.
type AggregationMove = Pick<
  PickingPrintBackorderMove,
  'productId' | 'productName' | 'descriptionPicking' | 'uomName' | 'packagingUomName' | 'state' | 'demand' | 'quantity' | 'hasLines'
>;

const field = (shown: boolean, label: string, value: string): Field[] => (shown ? [[label, value]] : []);
const contact = (name: string, address: string) => [name, address].filter((part) => part !== '').join('\n');
const withPackage = (location: string, packageName: string) => (packageName === '' ? location : `${location} (${packageName})`);
const stateLabel = (state: string) => PICKING_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;
const typeLabel = (code: string) => PICKING_TYPE_CODE_OPTIONS.find((option) => option.value === code)?.label ?? code;
// Plain code-point order, as names sort on the server.
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const compareLocations = (left: PickingPrintLine | undefined, right: PickingPrintLine | undefined) =>
  compareText(left?.from ?? '', right?.from ?? '') || compareText(left?.to ?? '', right?.to ?? '');

const roundTo = (digits: number) => (value: number) => floatRound(value, 10 ** -digits);

const table = (columns: string[], rows: PrintTableCell[][]): TableBlock => ({
  kind: 'table',
  columns,
  rows,
  widths: columns.map((_, index) => (index === 0 ? 3 : 2)),
});

// Check digit of a GTIN number (EAN-8, EAN-13): weights 3 and 1 from the right.
const hasGtinCheckDigit = (digits: string) => {
  const body = [...digits.slice(0, -1)].reverse();
  const total = body.reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);

  return (10 - (total % 10)) % 10 === Number(digits[digits.length - 1]);
};

// A product barcode of 8 or 13 digits with a valid check digit prints as EAN-8 or EAN-13, anything
// else as Code 128. Thirteen digits starting with 0 are a 12-digit code written long, not EAN-13.
export const productBarcodeSymbology = (value: string): BarcodeBlock['symbology'] => {
  if (!/^\d+$/.test(value) || !hasGtinCheckDigit(value)) {
    return 'code128';
  }
  if (value.length === 13 && !value.startsWith('0')) {
    return 'ean13';
  }

  return value.length === 8 ? 'ean8' : 'code128';
};

// Code 128 holds printable ASCII only; a name in another script prints as text instead of failing the page.
const isCode128Text = (value: string) => /^[\x20-\x7E]+$/.test(value);

// Product barcodes print bare; lot and package barcodes carry their name under the bars.
const barcodeCell = (value: string, caption?: string, symbology: BarcodeBlock['symbology'] = 'code128'): PrintTableCell => {
  if (value === '') {
    return '';
  }
  if (symbology === 'code128' && !isCode128Text(value)) {
    return caption ?? value;
  }

  return { kind: 'barcode', symbology, value, ...(caption === undefined ? {} : { caption }), widthMm: 40, heightMm: 9 };
};

const barcodeBlock = (value: string, caption?: string): PrintBlock =>
  isCode128Text(value)
    ? { kind: 'barcode', symbology: 'code128', value, ...(caption === undefined ? {} : { caption }), widthMm: 60, heightMm: 12 }
    : { kind: 'text', text: value };

// The transfer's own wording for a product, without the product name it often starts with.
const reportDescription = (productName: string, description: string) =>
  description.startsWith(productName) ? description.slice(productName.length).trim() : description.trim();

const productCell = (productName: string, description: string) => (description === '' ? productName : `${productName}\n${description}`);

const deliveryProductCell = (move: Pick<PickingPrintMove, 'productName' | 'descriptionPicking'>) =>
  productCell(move.productName, reportDescription(move.productName, move.descriptionPicking));

const fullDescriptionCell = (move: Pick<PickingPrintMove, 'productName' | 'descriptionPicking'>) =>
  productCell(move.productName, move.descriptionPicking === move.productName ? '' : move.descriptionPicking);

const shouldPrintDeliveryAddress = (picking: PickingPrintData) =>
  picking.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING && picking.moves.length > 0 && picking.deliveryPartnerName !== '';

const hasCustomerCompany = (picking: PickingPrintData) =>
  picking.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING && picking.partnerName !== '' && picking.commercialPartnerName !== '';

// The picking operations name the customer and the vendor from the transfer's own contact only.
const hasOwnCustomerCompany = (picking: PickingPrintData) => picking.hasTransferPartner && hasCustomerCompany(picking);

const vendorName = (picking: PickingPrintData) => picking.commercialPartnerName || picking.partnerName;
const vendorAddress = (picking: PickingPrintData) =>
  picking.commercialPartnerName === ''
    ? contact(picking.partnerName, picking.partnerAddress)
    : contact(picking.commercialPartnerName, picking.commercialPartnerAddress);

const pickingOperationsFields = (picking: PickingPrintData, timeZone: string): Field[] => [
  ...field(
    shouldPrintDeliveryAddress(picking),
    'Delivery Address:',
    contact(picking.deliveryPartnerName, picking.deliveryPartnerAddress),
  ),
  ...field(hasOwnCustomerCompany(picking), 'Customer Address:', picking.commercialPartnerName),
  ...field(picking.origin !== '', 'Order:', picking.origin),
  ['Warehouse:', picking.warehouseName],
  ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL && picking.partnerName !== '', 'Contact', picking.partnerName),
  ['Status:', stateLabel(picking.state)],
  ...field(picking.responsibleName !== '', 'Operator:', picking.responsibleName),
  ...field(picking.state === PICKING_STATE.DONE && picking.dateDone !== null, 'Done Date:', dayInTimeZone(picking.dateDone, timeZone)),
  ...field(
    picking.state !== PICKING_STATE.DONE && picking.scheduledDate !== null,
    'Scheduled Date:',
    dayInTimeZone(picking.scheduledDate, timeZone),
  ),
  ...field(picking.warningText !== '', 'Instructions:', picking.warningText.trim()),
  ...field(
    picking.pickingTypeCode === PICKING_TYPE_CODE.INCOMING && picking.hasTransferPartner && picking.partnerName !== '',
    'Vendor:',
    vendorName(picking),
  ),
];

const operationsTable = (picking: PickingPrintData): TableBlock | null => {
  const showFrom = picking.pickingTypeCode !== PICKING_TYPE_CODE.INCOMING;
  const showTo = picking.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING;
  const allLines = picking.moves.flatMap((move) => move.lines);
  const showBarcode =
    picking.moves.some((move) => move.productBarcode !== '' && move.lines.length > 0) || allLines.some((line) => line.lotName !== '');

  if (!allLines.some((line) => !line.isEntirePack)) {
    return null;
  }
  const moves = picking.moves
    .filter((move) => move.quantity !== 0 && move.lines.some((line) => !line.isEntirePack))
    .sort((left, right) => compareLocations(left.lines[0], right.lines[0]));
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
      `${amountText(move.quantity, move.uomName, picking.unitDigits)}${packaging}`,
      ...cells(
        hasLineRows ? '' : withPackage(first.from, first.packageName),
        hasLineRows ? '' : withPackage(first.to, first.resultPackageName),
        barcodeCell(move.productBarcode, undefined, productBarcodeSymbology(move.productBarcode)),
      ),
    ]);
    if (hasLineRows) {
      for (const line of [...lines].sort(compareLocations)) {
        rows.push([
          line.lotName === '' ? '' : `    ${line.lotName}`,
          amountText(line.quantity, line.uomName, picking.unitDigits),
          ...cells(
            withPackage(line.from, line.packageName),
            withPackage(line.to, line.resultPackageName),
            barcodeCell(line.lotBarcode, line.lotBarcode),
          ),
        ]);
      }
    }
  }

  return table(['Product', 'Quantity', ...(showFrom ? ['From'] : []), ...(showTo ? ['To'] : []), ...(showBarcode ? ['Barcode'] : [])], rows);
};

// Packages moved whole are listed by their outermost package, not by product: from the packages
// themselves while the transfer is open, from what was recorded at validation once done.
const packagesTable = (picking: PickingPrintData): TableBlock | null => {
  const allLines = picking.moves.flatMap((move) => move.lines);

  if (!allLines.some((line) => line.isEntirePack) || !PACKAGE_TABLE_STATES.includes(picking.state)) {
    return null;
  }
  const showFrom = picking.pickingTypeCode !== PICKING_TYPE_CODE.INCOMING;
  const showTo = picking.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING;
  const row = (name: string, from: string, to: string) => [
    barcodeCell(name, name),
    ...(showFrom ? [from] : []),
    ...(showTo ? [to] : []),
  ];
  const rows =
    picking.state === PICKING_STATE.DONE
      ? picking.packageHistories
          .filter(
            (history) =>
              history.parentDestId === null &&
              allLines.filter((line) => line.packageHistoryId === history.id).every((line) => line.isEntirePack),
          )
          .sort((left, right) => compareText(left.packageName, right.packageName))
          .map((history) =>
            row(history.packageName, withPackage(history.from, history.parentOrigName), withPackage(history.to, history.parentDestName)),
          )
      : [...picking.openPackages]
          .sort((left, right) => compareText(left.name, right.name))
          .map((openPackage) =>
            row(
              openPackage.name,
              withPackage(openPackage.from, openPackage.parentPackageName),
              withPackage(openPackage.to, openPackage.packageDestName),
            ),
          );

  return table(['Package', ...(showFrom ? ['From'] : []), ...(showTo ? ['To'] : [])], rows);
};

const isNotReserved = (picking: PickingPrintData) =>
  WAITING_STATES.includes(picking.state) ||
  picking.moves.some((move) => move.demand > move.quantity && move.lines.length > 0 && move.state !== MOVE_STATE.DONE);

const pickingOperationsBlocks = (picking: PickingPrintData, timeZone: string): PrintBlock[] => {
  const operations = operationsTable(picking);
  const packages = packagesTable(picking);

  return [
    { kind: 'heading', text: typeLabel(picking.pickingTypeCode) },
    { kind: 'title', text: picking.name },
    barcodeBlock(picking.name),
    { kind: 'fields', rows: pickingOperationsFields(picking, timeZone) },
    ...(operations === null ? [] : [operations]),
    ...(packages === null ? [] : [packages]),
    ...(isNotReserved(picking) ? [{ kind: 'text' as const, text: NOT_RESERVED_TEXT }] : []),
    ...(picking.note === '' ? [] : [{ kind: 'text' as const, text: picking.note }]),
  ];
};

const deliverySlipFields = (picking: PickingPrintData, timeZone: string): Field[] => {
  const address: Field[] = shouldPrintDeliveryAddress(picking)
    ? [['Delivery Address', contact(picking.deliveryPartnerName, picking.deliveryPartnerAddress)]]
    : field(
        picking.pickingTypeCode !== PICKING_TYPE_CODE.INTERNAL && picking.warehouseAddress !== '',
        'Warehouse Address',
        picking.warehouseAddress,
      );
  const isDone = picking.state === PICKING_STATE.DONE;

  return [
    ...address,
    ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INCOMING && picking.partnerName !== '', 'Vendor Address', vendorAddress(picking)),
    ...field(hasCustomerCompany(picking), 'Customer', contact(picking.commercialPartnerName, picking.commercialPartnerAddress)),
    ...field(picking.origin !== '', 'Order', picking.origin),
    ...field(picking.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL && picking.partnerName !== '', 'Contact', picking.partnerName),
    ['Shipping Date', dateTimeInTimeZone(isDone ? picking.dateDone : picking.scheduledDate, timeZone)],
    ...field(picking.responsibleName !== '', 'Operator:', picking.responsibleName),
  ];
};

const amountText = (quantity: number, uomName: string, digits: number) => {
  const rounded = roundTo(digits)(quantity);

  return uomName === '' ? `${rounded}` : `${rounded} ${uomName}`;
};

// The quantity in the move's unit and, under it, in its packaging when the packaging is another unit.
const withPackaging = (
  quantity: number,
  uomName: string,
  packaging: { name: string | null; factor: number | null },
  digits: number,
) =>
  packaging.name !== null && packaging.factor !== null && packaging.name !== uomName
    ? `${amountText(quantity, uomName, digits)}\n${amountText(quantity * packaging.factor, packaging.name, digits)}`
    : amountText(quantity, uomName, digits);

const aggregationKey = (move: Pick<AggregationMove, 'productId' | 'productName' | 'descriptionPicking' | 'uomName' | 'packagingUomName'>) =>
  JSON.stringify([
    move.productId,
    move.productName,
    reportDescription(move.productName, move.descriptionPicking),
    move.uomName,
    move.packagingUomName ?? '',
  ]);

// One line per product, description, unit and packaging (and destination package). Unless strict,
// what was ordered also counts the demand that went on to backorders and the demand cancelled
// without delivery, so a partial delivery still shows the whole order.
const aggregateLines = (
  doneLines: DoneLine[],
  picking: PickingPrintData,
  options: { strict: boolean; exceptPackage: boolean },
): Aggregated[] => {
  const round = roundTo(picking.unitDigits);
  const aggregated = new Map<string, Aggregated>();
  const chainMoves = picking.backorderMoves;

  for (const { move, line } of doneLines) {
    if (options.exceptPackage && line.resultPackageId !== null) {
      continue;
    }
    const baseKey = aggregationKey(move);
    const key = JSON.stringify([baseKey, line.resultPackageId ?? '']);
    const existing = aggregated.get(key);

    if (existing !== undefined) {
      existing.ordered = round(existing.ordered + line.quantity);
      existing.delivered = round(existing.delivered + line.quantity);
      continue;
    }
    let ordered = line.quantity;

    if (!options.strict) {
      const orderedLater = chainMoves
        .filter((chainMove) => chainMove.hasLines && aggregationKey(chainMove) === baseKey)
        .reduce((sum, chainMove) => sum + chainMove.demand, 0);
      const otherLines = move.lines.filter((other) => other !== line).reduce((sum, other) => sum + other.quantity, 0);

      ordered = round(move.demand + orderedLater - otherLines);
    }
    aggregated.set(key, {
      baseKey,
      packageId: line.resultPackageId,
      packageName: line.resultPackageName,
      packageHistoryId: line.packageHistoryId,
      product: deliveryProductCell(move),
      uomName: move.uomName,
      packagingUomName: move.packagingUomName,
      packagingFactor: move.packagingFactor,
      ordered,
      delivered: round(line.quantity),
    });
  }
  if (options.strict) {
    return [...aggregated.values()];
  }
  const emptyMoves: (AggregationMove & { packagingFactor: number | null })[] = [
    ...picking.moves.map((move) => ({ ...move, hasLines: move.lines.length > 0 })),
    ...chainMoves.map((move) => ({ ...move, packagingFactor: null })),
  ];

  for (const move of emptyMoves) {
    if (move.demand === 0 || round(move.quantity) !== 0) {
      continue;
    }
    // A waiting move with no lines counts towards an existing line only; other open moves not at all.
    let countsOnlyTowardsExisting = false;

    if (move.state !== MOVE_STATE.CANCEL) {
      if (move.state !== MOVE_STATE.CONFIRMED || move.hasLines) {
        continue;
      }
      countsOnlyTowardsExisting = true;
    }
    const baseKey = aggregationKey(move);
    const sameProduct = [...aggregated.values()].filter((entry) => entry.baseKey === baseKey);
    const unpackaged = sameProduct.find((entry) => entry.packageId === null);
    const target = unpackaged ?? sameProduct[0];

    if (target !== undefined) {
      target.ordered = round(target.ordered + move.demand);
    } else if (!countsOnlyTowardsExisting) {
      aggregated.set(JSON.stringify([baseKey, '']), {
        baseKey,
        packageId: null,
        packageName: '',
        packageHistoryId: null,
        product: deliveryProductCell(move),
        uomName: move.uomName,
        packagingUomName: move.packagingUomName,
        packagingFactor: move.packagingFactor,
        ordered: round(move.demand),
        delivered: 0,
      });
    }
  }

  return [...aggregated.values()];
};

// A nested package's name inside the outermost container it went into.
const nameInsideOutermost = (history: PickingPrintPackageHistory) => {
  if (history.parentDestId === null) {
    return '';
  }
  if (history.parentDestId === history.outermostDestId) {
    return history.packageName;
  }

  return history.completeName.split(' > ').slice(1).join(' > ');
};

const doneTable = (picking: PickingPrintData, timeZone: string): TableBlock | null => {
  const doneLines: DoneLine[] = picking.moves.flatMap((move) => move.lines.map((line) => ({ move, line })));

  if (doneLines.length === 0) {
    return null;
  }
  const digits = picking.unitDigits;
  const historyById = new Map(picking.packageHistories.map((history) => [history.id, history]));
  const hasPackages = picking.packageHistories.length > 0;
  const hasMultiLevelPackages = picking.packageHistories.some((history) => history.parentDestId !== null);
  const hasLots = doneLines.some(({ line }) => line.lotName !== '');
  const hasExpiry = hasLots && doneLines.some(({ line }) => line.expirationDate !== null);
  const columns = [
    'Product',
    ...(hasMultiLevelPackages ? ['Package'] : []),
    hasLots ? 'Lot/Serial Number' : 'Ordered',
    ...(hasExpiry ? ['Expiration Date'] : []),
    'Delivered',
  ];
  const packageCell = (packageId: string | null, packageName: string, historyId: string | null, sectionPackageId: string | null) => {
    if (!hasMultiLevelPackages) {
      return [];
    }
    const history = historyId === null ? undefined : historyById.get(historyId);

    return [packageId === null || packageId === sectionPackageId ? '' : history === undefined ? packageName : nameInsideOutermost(history)];
  };
  const lotRow = (sectionPackageId: string | null) => ({ move, line }: DoneLine) => [
    fullDescriptionCell(move),
    ...packageCell(line.resultPackageId, line.resultPackageName, line.packageHistoryId, sectionPackageId),
    line.lotName,
    ...(hasExpiry ? [dayInTimeZone(line.expirationDate, timeZone)] : []),
    withPackaging(line.quantity, line.uomName, { name: move.packagingUomName, factor: move.packagingFactor }, digits),
  ];
  const aggregatedRow = (sectionPackageId: string | null) => (entry: Aggregated) => {
    const packaging = { name: entry.packagingUomName, factor: entry.packagingFactor };

    return [
      entry.product,
      ...packageCell(entry.packageId, entry.packageName, entry.packageHistoryId, sectionPackageId),
      withPackaging(entry.ordered, entry.uomName, packaging, digits),
      withPackaging(entry.delivered, entry.uomName, packaging, digits),
    ];
  };
  const sectionRow = (title: string) => [title, ...columns.slice(1).map(() => '')];

  if (!hasPackages) {
    return table(
      columns,
      hasLots
        ? doneLines.map(lotRow(null))
        : aggregateLines(doneLines, picking, { strict: false, exceptPackage: false }).map(aggregatedRow(null)),
    );
  }
  const sections = new Map<string, string>();

  for (const history of picking.packageHistories.filter((candidate) => candidate.parentDestId === null)) {
    if (!sections.has(history.packageId)) {
      sections.set(history.packageId, history.packageName);
    }
  }
  const rows: PrintTableCell[][] = [];

  for (const [packageId, packageName] of sections) {
    const inPackage = doneLines
      .filter(
        ({ line }) =>
          line.resultPackageId === packageId ||
          (line.packageHistoryId !== null && historyById.get(line.packageHistoryId)?.outermostDestId === packageId),
      )
      .sort((left, right) => compareText(left.move.productName, right.move.productName));

    rows.push(sectionRow(packageName));
    rows.push(
      ...(hasLots
        ? inPackage.map(lotRow(packageId))
        : aggregateLines(inPackage, picking, { strict: true, exceptPackage: false }).map(aggregatedRow(packageId))),
    );
  }
  const unpacked = doneLines.filter(({ line }) => line.resultPackageId === null);
  const unpackedAggregated = hasLots ? [] : aggregateLines(doneLines, picking, { strict: false, exceptPackage: true });

  if (unpacked.length > 0 || unpackedAggregated.length > 0) {
    rows.push(sectionRow(NO_PACKAGE_TEXT));
    rows.push(...(hasLots ? unpacked.map(lotRow(null)) : unpackedAggregated.map(aggregatedRow(null))));
  }

  return table(columns, rows);
};

const openSlipTable = (picking: PickingPrintData) =>
  table(
    ['Product', 'Ordered', 'Delivered'],
    picking.moves
      .filter((move) => move.demand !== 0)
      .map((move) => {
        const orderedPackaging =
          move.packagingUomName !== null && move.packagingUomName !== move.uomName
            ? `\n${amountText(move.packagingQty, move.packagingUomName, picking.unitDigits)}`
            : '';

        return [
          deliveryProductCell(move),
          `${amountText(move.demand, move.uomName, picking.unitDigits)}${orderedPackaging}`,
          withPackaging(move.quantity, move.uomName, { name: move.packagingUomName, factor: move.packagingFactor }, picking.unitDigits),
        ];
      }),
  );

const signatureBlocks = (picking: PickingPrintData): PrintBlock[] => {
  if (picking.signaturePng === null && !picking.signatureFailed) {
    return [];
  }

  return [
    { kind: 'heading', text: 'Signature' },
    picking.signaturePng === null ? { kind: 'text', text: SIGNATURE_FAILED_TEXT } : { kind: 'image', png: picking.signaturePng, widthMm: 60 },
    ...(picking.partnerName === '' ? [] : [{ kind: 'text' as const, text: picking.partnerName }]),
  ];
};

const deliverySlipBlocks = (picking: PickingPrintData, timeZone: string): PrintBlock[] => {
  const lines = picking.state === PICKING_STATE.DONE ? doneTable(picking, timeZone) : openSlipTable(picking);
  const remaining = picking.backorderMoves.filter(
    (move) => move.isDirectBackorder && !CLOSED_STATES.includes(move.pickingState) && move.demand !== 0,
  );

  return [
    { kind: 'title', text: `${CODE_REPORT_NAMES[picking.pickingTypeCode]} ${picking.name}` },
    { kind: 'fields', rows: deliverySlipFields(picking, timeZone) },
    ...(lines === null ? [] : [lines]),
    ...(remaining.length > 0
      ? [
          { kind: 'text' as const, text: 'Remaining quantities not yet delivered:' },
          table(
            ['Product', 'Quantity'],
            remaining.map((move) => [deliveryProductCell(move), amountText(move.demand, move.uomName, picking.unitDigits)]),
          ),
        ]
      : []),
    ...signatureBlocks(picking),
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
  barcodeBlock(picking.name, picking.name),
  barcodeBlock('OBTRETU', 'OBTRETU'),
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
