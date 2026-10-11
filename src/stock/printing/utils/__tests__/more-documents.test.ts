import { describe, expect, it } from 'vitest';

import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';
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

const UTC = { timeZone: 'UTC' };
const tables = (blocks: PrintBlock[]) => blocks.filter((block): block is Extract<PrintBlock, { kind: 'table' }> => block.kind === 'table');
const texts = (blocks: PrintBlock[]) => blocks.flatMap((block) => ('text' in block ? [block.text] : []));
const quants = [
  { locationName: 'WH/Stock/Shelf 1', productName: 'Belt', lotName: '', packageName: '', quantity: 7, uomName: 'Units' },
  { locationName: 'WH/Stock/Shelf 2', productName: 'Oil', lotName: 'L1', packageName: 'PACK1', quantity: 2.5, uomName: 'L' },
  { locationName: 'WH/Stock/Shelf 1', productName: 'Bolt', lotName: '', packageName: '', quantity: 3, uomName: 'Units' },
];

describe('buildCountSheet', () => {
  it('groups by location and leaves the quantity blank to write in', () => {
    const blocks = buildCountSheet(quants, false, 2).blocks;

    expect(blocks[0]).toEqual({ kind: 'title', text: 'Inventory Count Sheet' });
    expect(tables(blocks)[0]).toMatchObject({
      columns: ['Location', 'Product', 'Lot/Serial Number', 'Package', 'Quantity'],
      rows: [
        ['WH/Stock/Shelf 1', '', '', '', ''],
        ['', 'Belt', '', '', 'Units'],
        ['', 'Bolt', '', '', 'Units'],
        ['WH/Stock/Shelf 2', '', '', '', ''],
        ['', 'Oil', 'L1', 'PACK1', 'L'],
      ],
    });
  });

  it('shows the expected quantity at the unit decimals when the setting is on', () => {
    expect(tables(buildCountSheet(quants, true, 2).blocks)[0].rows[1]).toEqual(['', 'Belt', '', '', '7.00 Units']);
  });
});

describe('buildBarcodeSheet', () => {
  it('prints names on a 4 x 7 sheet, with the barcode and its number when there is one', () => {
    const sheet = buildBarcodeSheet([{ name: 'Stock', barcode: 'WHSTOCK' }, { name: 'Bin', barcode: '' }]);

    expect({ columns: sheet.columns, rows: sheet.rows, cellWidthMm: sheet.cellWidthMm, cellHeightMm: sheet.cellHeightMm }).toEqual({
      columns: 4,
      rows: 7,
      cellWidthMm: 47,
      cellHeightMm: 37.1,
    });
    expect(sheet.cells).toEqual([
      [{ kind: 'heading', text: 'Stock' }, { kind: 'barcode', symbology: 'code128', value: 'WHSTOCK', caption: 'WHSTOCK', widthMm: 47, heightMm: 11 }],
      [{ kind: 'heading', text: 'Bin' }],
    ]);
  });

  it('draws a number with a valid check digit as EAN-13', () => {
    expect(buildBarcodeSheet([{ name: 'Dock', barcode: '4006381333931' }]).cells[0][1]).toMatchObject({ symbology: 'ean13' });
  });
});

const row = (productId: string, productName: string, lotName: string, quantity: number, uomName = 'Units', productBarcode = '') => ({
  productId,
  productName,
  productBarcode,
  lotName,
  quantity,
  uomName,
});
const pallet = {
  name: 'PALLET1',
  packDate: '2026-10-08',
  packageTypeName: 'Pallet',
  quants: [row('belt', 'Belt', '', 4, 'Units', '123')],
  children: [{ name: 'BOX1', quants: [row('oil', 'Oil', 'L1', 2, 'L')] }],
  containedQuantCount: 2,
  directQuantCount: 1,
};

describe('buildPackageContents', () => {
  it('lists child packages, then the loose content under "No assigned package"', () => {
    const blocks = buildPackageContents([pallet], 2).blocks;

    expect(texts(blocks).slice(0, 2)).toEqual(['PALLET1', 'BOX1']);
    expect(texts(blocks)).toContain('No assigned package');
    expect(tables(blocks)[0]).toMatchObject({
      columns: ['Barcode', 'Product', 'Quantity', 'Contents'],
      rows: [
        ['', 'Oil', '2.0 L', ''],
        ['', '    L1', '2.00 L', { kind: 'barcode', symbology: 'qrcode', value: 'L1', widthMm: 14, heightMm: 14 }],
      ],
    });
    expect(tables(blocks)[1].rows).toEqual([[{ kind: 'barcode', symbology: 'code128', value: '123', caption: '123', widthMm: 50, heightMm: 13 }, 'Belt', '4.0 Units', '']]);
  });

  it('prints the pack date and package type, and the package name as a barcode', () => {
    const blocks = buildPackageContents([pallet], 2).blocks;

    expect(blocks.slice(0, 3)).toEqual([
      { kind: 'title', text: 'PALLET1' },
      { kind: 'barcode', symbology: 'code128', value: 'PALLET1', caption: 'PALLET1', widthMm: 79, heightMm: 13 },
      { kind: 'fields', rows: [['Pack Date:', '2026-10-08'], ['Package Type:', 'Pallet']] },
    ]);
  });

  it('shows the content without a section when every row is in the package itself', () => {
    const blocks = buildPackageContents([{ ...pallet, children: [], containedQuantCount: 1 }], 2).blocks;

    expect(texts(blocks)).toEqual(['PALLET1']);
    expect(tables(blocks)).toHaveLength(1);
  });

  it('skips rows at zero and lists no lots when a product has none', () => {
    const blocks = buildPackageContents(
      [{ ...pallet, children: [], quants: [row('belt', 'Belt', '', 4), row('belt', 'Belt', '', 0), row('bolt', 'Bolt', '', 0)], containedQuantCount: 3, directQuantCount: 3 }],
      2,
    ).blocks;

    expect(tables(blocks)[0].rows).toEqual([['', 'Belt', '4.0 Units', '']]);
  });

  it('starts each package on a new page', () => {
    expect(buildPackageContents([pallet, { ...pallet, name: 'PALLET2' }], 2).blocks.filter((block) => block.kind === 'pageBreak')).toHaveLength(1);
  });
});

describe('buildPackageSmall', () => {
  it('prints the name as a large barcode with the name, pack date and type under it', () => {
    expect(buildPackageSmall([pallet]).blocks).toEqual([
      { kind: 'barcode', symbology: 'code128', value: 'PALLET1', widthMm: 159, heightMm: 26 },
      { kind: 'heading', text: 'PALLET1' },
      { kind: 'text', text: 'Pack Date: 2026-10-08' },
      { kind: 'text', text: 'Package Type: Pallet' },
    ]);
  });
});

describe('buildReceptionReport', () => {
  const data = {
    reason: null,
    docs: [{ name: 'WH/IN/00001', state: 'ASSIGNED' }],
    sources: [
      {
        name: 'WH/OUT/00002',
        partnerName: 'Gym A',
        scheduledDate: '2026-10-11T02:30:00.000Z',
        lines: [
          { productName: 'Belt', quantity: 4, uomName: 'Units', isAssigned: true },
          { productName: 'Bolt', quantity: 1, uomName: 'Units', isAssigned: false },
        ],
      },
      { name: 'WH/OUT/00003', partnerName: '', scheduledDate: null, lines: [{ productName: 'Oil', quantity: 2, uomName: 'L', isAssigned: false }] },
    ],
  };

  it('heads the page with each transfer, its barcode and status', () => {
    expect(buildReceptionReport(data, UTC).blocks.slice(0, 3)).toEqual([
      { kind: 'heading', text: 'WH/IN/00001' },
      { kind: 'barcode', symbology: 'code128', value: 'WH/IN/00001', widthMm: 79, heightMm: 13 },
      { kind: 'text', text: 'Ready' },
    ]);
  });

  it('prints only the allocated lines, under the delivery they go to', () => {
    const blocks = buildReceptionReport(data, { timeZone: 'America/Denver' }).blocks;

    expect(tables(blocks)).toEqual([
      { kind: 'table', columns: ['WH/OUT/00002: Gym A', 'Expected Delivery: 2026-10-10'], rows: [['Belt', '4.0 Units']], widths: [3, 2] },
    ]);
    expect(texts(blocks)).toEqual(['WH/IN/00001', 'Ready']);
  });

  it('says why when the transfers cannot be reported on', () => {
    const blocks = buildReceptionReport({ reason: 'No transfers selected or a delivery order selected', docs: [], sources: [] }, UTC).blocks;

    expect(texts(blocks)).toEqual(['No transfers selected or a delivery order selected', 'No allocation need found.']);
  });
});

describe('buildReceptionLabels', () => {
  it('prints one label per unit of demand, rounded up', () => {
    const sheet = buildReceptionLabels([{ productDisplayName: 'Belt', sourceName: 'WH/OUT/00002', partnerAddress: 'Gym A', demand: 2.2 }]);

    expect({ width: sheet.pageWidthMm, height: sheet.pageHeightMm }).toEqual({ width: 57, height: 32 });
    expect(sheet.cells).toHaveLength(3);
    expect(sheet.cells[0]).toEqual([
      { kind: 'text', text: 'Belt' },
      { kind: 'text', text: 'WH/OUT/00002' },
      { kind: 'text', text: 'Gym A' },
    ]);
  });

  it('puts each line of the address on its own line', () => {
    expect(
      buildReceptionLabels([{ productDisplayName: 'Belt', sourceName: '', partnerAddress: 'Gym A\n1 Main St', demand: 1 }]).cells[0],
    ).toEqual([
      { kind: 'text', text: 'Belt' },
      { kind: 'text', text: 'Gym A' },
      { kind: 'text', text: '1 Main St' },
    ]);
  });
});

const traceRow = (lineId: string, reference: string): TraceRow => ({
  lineId,
  reference,
  referenceRecord: null,
  productName: 'Belt',
  date: '2026-10-11T02:30:00.000Z',
  lotId: null,
  lotName: 'L1',
  from: 'Vendor',
  fromRecord: null,
  to: 'WH/Stock',
  toRecord: null,
  quantity: '4.00 Units',
  quantityValue: 4,
  uomName: 'Units',
  usage: 'in',
  unfoldable: false,
  pickingId: null,
});

describe('buildTraceabilityPdf', () => {
  it('prints the rows on a landscape page, unfolded rows indented under their parent', () => {
    const document = buildTraceabilityPdf(
      [
        { row: traceRow('a', 'WH/OUT/00001'), level: 1 },
        { row: traceRow('b', 'WH/IN/00001'), level: 2 },
      ],
      'L1',
      { timeZone: 'America/Denver' },
    );

    expect(document.landscape).toBe(true);
    expect(document.blocks.slice(0, 2)).toEqual([
      { kind: 'title', text: 'Traceability Report' },
      { kind: 'text', text: 'Reference: L1' },
    ]);
    expect(tables(document.blocks)[0]).toMatchObject({
      columns: ['Reference', 'Product', 'Date', 'Lot/Serial #', 'From', 'To', 'Quantity'],
      rows: [
        ['WH/OUT/00001', 'Belt', '2026-10-10 20:30:00', 'L1', 'Vendor', 'WH/Stock', '4.00 Units'],
        ['  WH/IN/00001', 'Belt', '2026-10-10 20:30:00', 'L1', 'Vendor', 'WH/Stock', '4.00 Units'],
      ],
    });
  });
});

describe('buildBatchTransfer', () => {
  const line = { productBarcode: '', quantity: 1, uomName: 'Units', lotName: '', packageName: '', resultPackageName: '', locationDestName: 'WH/Output' };
  const batch = {
    name: 'BATCH/OUT/00001',
    responsibleName: 'Alex',
    pickings: [
      { name: 'WH/OUT/00002', state: 'ASSIGNED', scheduledDate: null, batchSequence: 2 },
      { name: 'WH/OUT/00001', state: 'ASSIGNED', scheduledDate: '2026-10-11T02:30:00.000Z', batchSequence: 1 },
    ],
    lines: [
      { ...line, productId: 'b', productName: 'Bolt', pickingName: 'WH/OUT/00001', locationName: 'WH/Stock/B' },
      { ...line, productId: 'a', productName: 'Belt', pickingName: 'WH/OUT/00002', locationName: 'WH/Stock/A' },
    ],
  };

  it('summarises the transfers, then lists lines from each source to each destination', () => {
    const blocks = buildBatchTransfer([batch], UTC).blocks;

    expect(blocks[0]).toEqual({ kind: 'title', text: 'Summary: BATCH/OUT/00001' });
    expect(tables(blocks)[0]).toMatchObject({
      columns: ['Transfer', 'Barcode', 'Status', 'Scheduled Date'],
      rows: [
        ['WH/OUT/00001', { kind: 'barcode', symbology: 'code128', value: 'WH/OUT/00001', widthMm: 53, heightMm: 13 }, 'Ready', '2026-10-11 02:30:00'],
        ['WH/OUT/00002', { kind: 'barcode', symbology: 'code128', value: 'WH/OUT/00002', widthMm: 53, heightMm: 13 }, 'Ready', ''],
      ],
    });
    expect(texts(blocks).filter((text) => text.startsWith('FROM'))).toEqual(['FROM WH/Stock/A TO WH/Output', 'FROM WH/Stock/B TO WH/Output']);
    expect(tables(blocks)[1]).toMatchObject({ columns: ['Product', 'Quantity', 'Transfer'], rows: [['Belt', '1.0 Units', 'WH/OUT/00002']] });
  });

  it('adds lot, barcode and package columns only when a line has one', () => {
    const blocks = buildBatchTransfer(
      [{ ...batch, lines: [{ ...batch.lines[0], lotName: 'SN1', productBarcode: '123', packageName: 'BOX1', resultPackageName: 'PAL1' }] }],
      UTC,
    ).blocks;

    expect(tables(blocks)[1]).toMatchObject({
      columns: ['Product', 'Quantity', 'Transfer', 'Lot/Serial Number', 'Product Barcode', 'Package'],
      rows: [
        [
          'Bolt',
          '1.0 Units',
          'WH/OUT/00001',
          { kind: 'barcode', symbology: 'code128', value: 'SN1', caption: 'SN1', widthMm: 40, heightMm: 9 },
          { kind: 'barcode', symbology: 'code128', value: '123', widthMm: 40, heightMm: 9 },
          'BOX1 → PAL1',
        ],
      ],
    });
  });
});
