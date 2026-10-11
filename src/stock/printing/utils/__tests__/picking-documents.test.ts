import { describe, expect, it } from 'vitest';

import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import { buildDeliverySlip, buildPickingOperations, buildReturnSlip } from 'src/stock/printing/utils/picking-documents.util';

const line = (overrides: Partial<PickingPrintLine> = {}): PickingPrintLine => ({
  productName: 'Treadmill',
  lotName: '',
  lotBarcode: '',
  quantity: 2,
  uomName: 'Units',
  from: 'WH/Stock',
  to: 'Partners/Customers',
  packageName: '',
  resultPackageName: '',
  isEntirePack: false,
  expirationDate: null,
  ...overrides,
});

const move = (overrides: Partial<PickingPrintMove> = {}): PickingPrintMove => ({
  productName: 'Treadmill',
  productBarcode: '',
  descriptionPicking: 'Treadmill',
  demand: 2,
  quantity: 2,
  uomName: 'Units',
  packagingUomName: null,
  packagingQty: 0,
  isTracked: false,
  lines: [line()],
  ...overrides,
});

const picking = (overrides: Partial<PickingPrintData>): PickingPrintData => ({
  id: 'p1',
  name: 'WH/OUT/00001',
  origin: 'SO001',
  state: 'ASSIGNED',
  pickingTypeCode: 'OUTGOING',
  scheduledDate: '2026-10-08T10:00:00.000Z',
  dateDone: null,
  partnerName: 'Gym A',
  partnerAddress: '1 Main St',
  responsibleName: 'Alex',
  note: '',
  warningText: '',
  warehouseName: 'Warehouse',
  warehouseAddress: '',
  sourceWarehouseAddress: '9 Dock Rd',
  moves: [move()],
  backorderMoves: [],
  backorderChainMoves: [],
  signaturePng: null,
  ...overrides,
});

type TableBlock = Extract<PrintBlock, { kind: 'table' }>;

const tablesOf = (blocks: PrintBlock[]) => blocks.filter((block): block is TableBlock => block.kind === 'table');
const tableOf = (blocks: PrintBlock[]) => tablesOf(blocks)[0];
const texts = (blocks: PrintBlock[]) => blocks.flatMap((block) => ('text' in block ? [block.text] : []));
const fieldsOf = (blocks: PrintBlock[]) =>
  blocks.flatMap((block) => (block.kind === 'fields' ? block.rows : []));

const UTC = { timeZone: 'UTC' };
const barcodeOf = (value: string, caption?: string) => ({
  kind: 'barcode',
  symbology: 'code128',
  value,
  ...(caption === undefined ? {} : { caption }),
  widthMm: 40,
  heightMm: 9,
});

const NOT_RESERVED = 'All products could not be reserved. Click on the "Check Availability" button to try to reserve products.';

describe('buildPickingOperations', () => {
  it('drops the To column on a delivery and has no Barcode column without barcodes', () => {
    expect(tableOf(buildPickingOperations([picking({})], {}, UTC).blocks)?.columns).toEqual(['Product', 'Quantity', 'From']);
  });

  it('drops the From column on a receipt and shows barcodes when a product has one', () => {
    const receipt = picking({ pickingTypeCode: 'INCOMING', moves: [move({ productBarcode: '4006381333931' })] });

    expect(tableOf(buildPickingOperations([receipt], {}, UTC).blocks)?.columns).toEqual(['Product', 'Quantity', 'To', 'Barcode']);
  });

  it("draws the product's barcode in its cell, without the number under it", () => {
    const receipt = picking({ pickingTypeCode: 'INCOMING', moves: [move({ productBarcode: '4006381333931' })] });

    expect(tableOf(buildPickingOperations([receipt], {}, UTC).blocks)?.rows).toEqual([
      ['Treadmill', '2 Units', 'Partners/Customers', barcodeOf('4006381333931')],
    ]);
  });

  it('prints the done date as the reader in Denver saw it on the evening of 2026-10-10', () => {
    const done = picking({ state: 'DONE', dateDone: '2026-10-11T02:30:00.000Z' });

    expect(fieldsOf(buildPickingOperations([done], {}, { timeZone: 'America/Denver' }).blocks)).toContainEqual([
      'Done Date:',
      '2026-10-10',
    ]);
    expect(fieldsOf(buildDeliverySlip([done], {}, { timeZone: 'America/Denver' }).blocks)).toContainEqual([
      'Shipping Date',
      '2026-10-10',
    ]);
  });

  it('lists the lines of a tracked move under it', () => {
    const tracked = picking({
      moves: [
        move({
          isTracked: true,
          lines: [line({ lotName: 'SN1', lotBarcode: 'SN1', quantity: 1 }), line({ lotName: 'SN2', lotBarcode: 'SN2', quantity: 1 })],
        }),
      ],
    });

    expect(tableOf(buildPickingOperations([tracked], {}, UTC).blocks)?.rows).toEqual([
      ['Treadmill', '2 Units', '', ''],
      ['    SN1', '1 Units', 'WH/Stock', barcodeOf('SN1', 'SN1')],
      ['    SN2', '1 Units', 'WH/Stock', barcodeOf('SN2', 'SN2')],
    ]);
  });

  it('warns when a waiting transfer could not reserve everything', () => {
    const waiting = picking({ state: 'CONFIRMED', moves: [move({ quantity: 0, lines: [] })] });

    expect(texts(buildPickingOperations([waiting], {}, UTC).blocks)).toContain(NOT_RESERVED);
  });

  it('warns on a ready transfer when a move with lines holds less than its demand', () => {
    const partly = picking({ moves: [move({ demand: 3, quantity: 2 })] });

    expect(texts(buildPickingOperations([partly], {}, UTC).blocks)).toContain(NOT_RESERVED);
  });

  it('does not warn on a ready transfer whose demand is reserved', () => {
    expect(texts(buildPickingOperations([picking({})], {}, UTC).blocks)).not.toContain(NOT_RESERVED);
  });

  it('starts with the transfer name and its barcode', () => {
    const [title, barcode] = buildPickingOperations([picking({})], {}, UTC).blocks;

    expect(title).toEqual({ kind: 'title', text: 'WH/OUT/00001' });
    expect(barcode).toMatchObject({ kind: 'barcode', symbology: 'code128', value: 'WH/OUT/00001' });
  });

  it('shows the status by its name and the delivery address of a delivery', () => {
    const fields = fieldsOf(buildPickingOperations([picking({})], {}, UTC).blocks);

    expect(fields).toContainEqual(['Status:', 'Ready']);
    expect(fields).toContainEqual(['Delivery Address:', 'Gym A\n1 Main St']);
    expect(fields).toContainEqual(['Warehouse:', 'Warehouse']);
  });

  it('lists whole packages in their own table on a ready transfer', () => {
    const packed = picking({
      pickingTypeCode: 'INTERNAL',
      moves: [
        move({
          lines: [
            line({ packageName: 'PACK0002', resultPackageName: 'PACK0002', isEntirePack: true, to: 'WH/Output' }),
          ],
        }),
      ],
    });
    const tables = tablesOf(buildPickingOperations([packed], {}, UTC).blocks);

    expect(tables).toHaveLength(1);
    expect(tables[0]).toMatchObject({ columns: ['Package', 'From', 'To'], rows: [[barcodeOf('PACK0002', 'PACK0002'), 'WH/Stock', 'WH/Output']] });
  });

  it('puts each transfer on its own page', () => {
    const blocks = buildPickingOperations([picking({}), picking({ id: 'p2', name: 'WH/OUT/00002' })], {}, UTC).blocks;

    expect(blocks.filter((block) => block.kind === 'pageBreak')).toHaveLength(1);
  });
});

describe('buildDeliverySlip', () => {
  it('titles a delivery "Delivery Note" and lists ordered and delivered before it is done', () => {
    const blocks = buildDeliverySlip([picking({})], {}, UTC).blocks;

    expect(blocks[0]).toEqual({ kind: 'title', text: 'Delivery Note WH/OUT/00001' });
    expect(tableOf(blocks)).toMatchObject({ columns: ['Product', 'Ordered', 'Delivered'], rows: [['Treadmill', '2 Units', '2 Units']] });
  });

  it('titles a receipt "Goods Receipt Note"', () => {
    expect(buildDeliverySlip([picking({ pickingTypeCode: 'INCOMING' })], {}, UTC).blocks[0]).toEqual({
      kind: 'title',
      text: 'Goods Receipt Note WH/OUT/00001',
    });
  });

  it('lists lots with their expiry date once done, and the remaining quantities of the backorder', () => {
    const done = picking({
      state: 'DONE',
      dateDone: '2026-10-08T12:00:00.000Z',
      moves: [move({ lines: [line({ lotName: 'L42', expirationDate: '2027-01-31T00:00:00.000Z' })] })],
      backorderMoves: [{ productName: 'Rowing machine', descriptionPicking: '', demand: 3, uomName: 'Units' }],
    });
    const blocks = buildDeliverySlip([done], {}, UTC).blocks;
    const tables = tablesOf(blocks);

    expect(tables[0]).toMatchObject({
      columns: ['Product', 'Lot/Serial Number', 'Expiration Date', 'Delivered'],
      rows: [['Treadmill', 'L42', '2027-01-31', '2 Units']],
    });
    expect(texts(blocks)).toContain('Remaining quantities not yet delivered:');
    expect(tables[1]).toMatchObject({ columns: ['Product', 'Quantity'], rows: [['Rowing machine', '3 Units']] });
  });

  // A partly delivered transfer whose rest went to a backorder still shows what was ordered with it.
  it('adds the quantity moved to backorders to what was ordered, and shows a description of its own', () => {
    const done = picking({
      state: 'DONE',
      moves: [
        move({ productName: 'Product A', descriptionPicking: '', demand: 6, quantity: 6, lines: [line({ productName: 'Product A', quantity: 6 })] }),
        move({
          productName: 'Product B',
          descriptionPicking: 'Product B\nDescription2',
          demand: 2,
          quantity: 2,
          lines: [line({ productName: 'Product B', quantity: 2 })],
        }),
      ],
      backorderChainMoves: [
        { productName: 'Product A', descriptionPicking: '', demand: 4, uomName: 'Units' },
        { productName: 'Product B', descriptionPicking: 'Product B\nDescription2', demand: 8, uomName: 'Units' },
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)).toMatchObject({
      columns: ['Product', 'Ordered', 'Delivered'],
      rows: [
        ['Product A', '10 Units', '6 Units'],
        ['Product B\nDescription2', '10 Units', '2 Units'],
      ],
    });
  });

  it('adds up two moves of the same product into one line', () => {
    const done = picking({
      state: 'DONE',
      moves: [
        move({ demand: 10, quantity: 10, lines: [line({ quantity: 10 })] }),
        move({ demand: 5, quantity: 5, lines: [line({ quantity: 5 })] }),
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([['Treadmill', '15 Units', '15 Units']]);
  });

  it('groups delivered products under their packages', () => {
    const done = picking({
      state: 'DONE',
      moves: [
        move({
          demand: 15,
          quantity: 15,
          lines: [line({ quantity: 5, resultPackageName: 'PACK0001' }), line({ quantity: 10, resultPackageName: 'PACK0002' })],
        }),
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([
      ['PACK0001', '', ''],
      ['Treadmill', '5 Units', '5 Units'],
      ['PACK0002', '', ''],
      ['Treadmill', '10 Units', '10 Units'],
    ]);
  });

  it('shows the warehouse address on a receipt and the vendor', () => {
    const receipt = picking({ pickingTypeCode: 'INCOMING', partnerName: 'Supplier B', partnerAddress: '5 Port Rd', warehouseAddress: 'Main\n2 Depot St' });
    const fields = fieldsOf(buildDeliverySlip([receipt], {}, UTC).blocks);

    expect(fields).toContainEqual(['Warehouse Address', 'Main\n2 Depot St']);
    expect(fields).toContainEqual(['Vendor Address', 'Supplier B\n5 Port Rd']);
  });

  it('shows the signature with the contact name', () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const blocks = buildDeliverySlip([picking({ state: 'DONE', signaturePng: png })], {}, UTC).blocks;

    expect(blocks.slice(-3)).toEqual([
      { kind: 'heading', text: 'Signature' },
      { kind: 'image', png, widthMm: 60 },
      { kind: 'text', text: 'Gym A' },
    ]);
  });
});

describe('buildReturnSlip', () => {
  it('asks to put the slip in the parcel and carries the return barcodes', () => {
    const blocks = buildReturnSlip([picking({ pickingTypeCode: 'OUTGOING' })], {}, UTC).blocks;

    expect(blocks[0]).toEqual({ kind: 'title', text: 'RETURN OF WH/OUT/00001' });
    expect(texts(blocks)).toEqual(
      expect.arrayContaining(['Please put this document inside your return parcel.', 'Your parcel must be sent to this address:', '9 Dock Rd']),
    );
    expect(blocks.filter((block) => block.kind === 'barcode').map((block) => (block as { value: string }).value)).toEqual([
      'WH/OUT/00001',
      'OBTRETU',
    ]);
  });

  it('sends a receipt back to its contact', () => {
    const blocks = buildReturnSlip([picking({ pickingTypeCode: 'INCOMING', partnerName: 'Supplier B', partnerAddress: '5 Port Rd' })], {}, UTC).blocks;

    expect(texts(blocks)).toContain('Supplier B\n5 Port Rd');
  });
});
