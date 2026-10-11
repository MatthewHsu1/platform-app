import { describe, expect, it } from 'vitest';

import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type PickingPrintPackageHistory } from 'src/stock/printing/types/picking-print-package-history.type';
import { type PrintBlock } from 'src/stock/printing/types/print-block.type';
import {
  buildDeliverySlip,
  buildPickingOperations,
  buildReturnSlip,
  productBarcodeSymbology,
} from 'src/stock/printing/utils/picking-documents.util';

const line = (overrides: Partial<PickingPrintLine> = {}): PickingPrintLine => ({
  productName: 'Treadmill',
  lotName: '',
  lotBarcode: '',
  quantity: 2,
  uomName: 'Units',
  from: 'WH/Stock',
  to: 'Partners/Customers',
  packageName: '',
  resultPackageId: null,
  resultPackageName: '',
  packageHistoryId: null,
  isEntirePack: false,
  expirationDate: null,
  ...overrides,
});

const move = (overrides: Partial<PickingPrintMove> = {}): PickingPrintMove => ({
  productId: 'treadmill',
  productName: 'Treadmill',
  productBarcode: '',
  descriptionPicking: 'Treadmill',
  state: 'ASSIGNED',
  demand: 2,
  quantity: 2,
  uomName: 'Units',
  packagingUomName: null,
  packagingQty: 0,
  packagingFactor: null,
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
  commercialPartnerName: '',
  commercialPartnerAddress: '',
  deliveryPartnerName: 'Gym A',
  deliveryPartnerAddress: '1 Main St',
  responsibleName: 'Alex',
  note: '',
  warningText: '',
  warehouseName: 'Warehouse',
  warehouseAddress: '',
  sourceWarehouseAddress: '9 Dock Rd',
  unitDigits: 2,
  moves: [move()],
  backorderMoves: [],
  packageHistories: [],
  openPackages: [],
  signaturePng: null,
  signatureFailed: false,
  ...overrides,
});

const backorderMove = (overrides: Partial<PickingPrintBackorderMove> = {}): PickingPrintBackorderMove => ({
  pickingId: 'bo1',
  pickingState: 'ASSIGNED',
  isDirectBackorder: true,
  productId: 'treadmill',
  productName: 'Treadmill',
  descriptionPicking: '',
  state: 'ASSIGNED',
  demand: 1,
  quantity: 1,
  uomName: 'Units',
  packagingUomName: null,
  hasLines: true,
  ...overrides,
});

const history = (overrides: Partial<PickingPrintPackageHistory> = {}): PickingPrintPackageHistory => ({
  id: 'h1',
  packageId: 'pack1',
  packageName: 'PACK0001',
  completeName: 'PACK0001',
  from: 'WH/Stock',
  parentOrigName: '',
  to: 'Partners/Customers',
  parentDestId: null,
  parentDestName: '',
  outermostDestId: null,
  ...overrides,
});

type TableBlock = Extract<PrintBlock, { kind: 'table' }>;

const tablesOf = (blocks: PrintBlock[]) => blocks.filter((block): block is TableBlock => block.kind === 'table');
const tableOf = (blocks: PrintBlock[]) => tablesOf(blocks)[0];
const texts = (blocks: PrintBlock[]) => blocks.flatMap((block) => ('text' in block ? [block.text] : []));
const fieldsOf = (blocks: PrintBlock[]) =>
  blocks.flatMap((block) => (block.kind === 'fields' ? block.rows : []));

const UTC = { timeZone: 'UTC' };
const barcodeOf = (value: string, caption?: string, symbology = 'code128') => ({
  kind: 'barcode',
  symbology,
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
      ['Treadmill', '2 Units', 'Partners/Customers', barcodeOf('4006381333931', undefined, 'ean13')],
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
      '2026-10-10 20:30:00',
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

  it('starts with the operation type, the transfer name and its barcode', () => {
    const [type, title, barcode] = buildPickingOperations([picking({})], {}, UTC).blocks;

    expect(type).toEqual({ kind: 'heading', text: 'Delivery' });
    expect(title).toEqual({ kind: 'title', text: 'WH/OUT/00001' });
    expect(barcode).toMatchObject({ kind: 'barcode', symbology: 'code128', value: 'WH/OUT/00001' });
  });

  it('shows the status by its name and the delivery address of a delivery', () => {
    const fields = fieldsOf(buildPickingOperations([picking({})], {}, UTC).blocks);

    expect(fields).toContainEqual(['Status:', 'Ready']);
    expect(fields).toContainEqual(['Delivery Address:', 'Gym A\n1 Main St']);
    expect(fields).toContainEqual(['Warehouse:', 'Warehouse']);
  });

  it('lists whole packages in their own table on a ready transfer, by their outermost package', () => {
    const packed = picking({
      pickingTypeCode: 'INTERNAL',
      moves: [
        move({
          lines: [line({ packageName: 'BOX1', resultPackageName: 'BOX1', isEntirePack: true, to: 'WH/Output' })],
        }),
      ],
      openPackages: [{ id: 'pal', name: 'PACK0002', from: 'WH/Stock', parentPackageName: '', to: 'WH/Output', packageDestName: '' }],
    });
    const tables = tablesOf(buildPickingOperations([packed], {}, UTC).blocks);

    expect(tables).toHaveLength(1);
    expect(tables[0]).toMatchObject({ columns: ['Package', 'From', 'To'], rows: [[barcodeOf('PACK0002', 'PACK0002'), 'WH/Stock', 'WH/Output']] });
  });

  it('lists whole packages of a done transfer from what was recorded at validation', () => {
    const done = picking({
      state: 'DONE',
      pickingTypeCode: 'INTERNAL',
      moves: [move({ state: 'DONE', lines: [line({ packageName: 'PAL1', resultPackageId: 'pal', resultPackageName: 'PAL1', packageHistoryId: 'hp', isEntirePack: true, to: 'WH/Output' })] })],
      packageHistories: [history({ id: 'hp', packageId: 'pal', packageName: 'PAL1', completeName: 'PAL1', parentOrigName: 'RACK1', to: 'WH/Output' })],
    });

    expect(tablesOf(buildPickingOperations([done], {}, UTC).blocks)[0]).toMatchObject({
      columns: ['Package', 'From', 'To'],
      rows: [[barcodeOf('PAL1', 'PAL1'), 'WH/Stock (RACK1)', 'WH/Output']],
    });
  });

  it('prints a lot name Code 128 cannot hold as text in its cell', () => {
    const tracked = picking({ moves: [move({ isTracked: true, lines: [line({ lotName: '批次1', lotBarcode: '批次1' })] })] });

    expect(tableOf(buildPickingOperations([tracked], {}, UTC).blocks)?.rows[1]).toEqual(['    批次1', '2 Units', 'WH/Stock', '批次1']);
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
      backorderMoves: [backorderMove({ productId: 'rower', productName: 'Rowing machine', demand: 3, quantity: 0, state: 'CONFIRMED', hasLines: false })],
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
        move({
          productId: 'a',
          productName: 'Product A',
          descriptionPicking: '',
          demand: 6,
          quantity: 6,
          lines: [line({ productName: 'Product A', quantity: 6 })],
        }),
        move({
          productId: 'b',
          productName: 'Product B',
          descriptionPicking: 'Product B\nDescription2',
          demand: 2,
          quantity: 2,
          lines: [line({ productName: 'Product B', quantity: 2 })],
        }),
      ],
      backorderMoves: [
        backorderMove({ productId: 'a', productName: 'Product A', demand: 4, quantity: 4 }),
        backorderMove({ productId: 'b', productName: 'Product B', descriptionPicking: 'Product B\nDescription2', demand: 8, quantity: 6 }),
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
          lines: [
            line({ quantity: 5, resultPackageId: 'pack1', resultPackageName: 'PACK0001', packageHistoryId: 'h1' }),
            line({ quantity: 10, resultPackageId: 'pack2', resultPackageName: 'PACK0002', packageHistoryId: 'h2' }),
          ],
        }),
      ],
      packageHistories: [history(), history({ id: 'h2', packageId: 'pack2', packageName: 'PACK0002', completeName: 'PACK0002' })],
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

  // A product out of stock: 2 of 10 delivered, the rest in a backorder that could not reserve anything.
  it('counts an unreserved backorder in what was ordered', () => {
    const done = picking({
      state: 'DONE',
      moves: [move({ productId: 'd', productName: 'Product D', descriptionPicking: '', state: 'DONE', demand: 2, quantity: 2, lines: [line({ quantity: 2 })] })],
      backorderMoves: [
        backorderMove({ productId: 'd', productName: 'Product D', state: 'CONFIRMED', demand: 8, quantity: 0, hasLines: false }),
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([['Product D', '10 Units', '2 Units']]);
  });

  // Validated without a backorder: the part not delivered stays on the transfer, cancelled.
  it('counts a cancelled move in what was ordered, and lists a product cancelled whole as not delivered', () => {
    const done = picking({
      state: 'DONE',
      moves: [
        move({ productId: 'a', productName: 'Product A', descriptionPicking: '', state: 'DONE', demand: 1, quantity: 1, uomName: 'Pack of 6', lines: [line({ quantity: 1, uomName: 'Pack of 6' })] }),
        move({ productId: 'a', productName: 'Product A', descriptionPicking: '', state: 'CANCEL', demand: 4, quantity: 0, uomName: 'Pack of 6', lines: [] }),
        move({ productId: 'b', productName: 'Product B', descriptionPicking: '', state: 'CANCEL', demand: 1, quantity: 0, uomName: 'Pack of 6', lines: [] }),
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([
      ['Product A', '5 Pack of 6', '1 Pack of 6'],
      ['Product B', '1 Pack of 6', '0 Pack of 6'],
    ]);
  });

  // 5 of 15 packed and delivered, the backorder for the other 10 cancelled.
  it('puts what was ordered but never packed under the products with no package', () => {
    const done = picking({
      state: 'DONE',
      moves: [
        move({
          productId: 'a',
          productName: 'Product A',
          descriptionPicking: '',
          state: 'DONE',
          demand: 5,
          quantity: 5,
          lines: [line({ quantity: 5, resultPackageId: 'pack1', resultPackageName: 'PACK0001', packageHistoryId: 'h1' })],
        }),
      ],
      backorderMoves: [
        backorderMove({ productId: 'a', productName: 'Product A', pickingState: 'CANCEL', state: 'CANCEL', demand: 10, quantity: 0, hasLines: false }),
      ],
      packageHistories: [history()],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([
      ['PACK0001', '', ''],
      ['Product A', '5 Units', '5 Units'],
      ['Products with no package assigned', '', ''],
      ['Product A', '10 Units', '0 Units'],
    ]);
  });

  it('files a box on a pallet under the pallet, naming the box in a Package column', () => {
    const done = picking({
      state: 'DONE',
      moves: [move({ state: 'DONE', lines: [line({ resultPackageId: 'box', resultPackageName: 'BOX1', packageHistoryId: 'hb' })] })],
      packageHistories: [
        history({ id: 'hb', packageId: 'box', packageName: 'BOX1', completeName: 'PAL1 > BOX1', parentDestId: 'pal', parentDestName: 'PAL1', outermostDestId: 'pal' }),
        history({ id: 'hp', packageId: 'pal', packageName: 'PAL1', completeName: 'PAL1' }),
      ],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)).toMatchObject({
      columns: ['Product', 'Package', 'Ordered', 'Delivered'],
      rows: [
        ['PAL1', '', '', ''],
        ['Treadmill', 'BOX1', '2 Units', '2 Units'],
      ],
    });
  });

  it('shows the packaging quantity under the delivered quantity', () => {
    const open = picking({ moves: [move({ demand: 12, quantity: 6, packagingUomName: 'Pack of 6', packagingQty: 2, packagingFactor: 1 / 6 })] });

    expect(tableOf(buildDeliverySlip([open], {}, UTC).blocks)?.rows).toEqual([
      ['Treadmill', '12 Units\n2 Pack of 6', '6 Units\n1 Pack of 6'],
    ]);
  });

  it('rounds merged quantities to the unit precision', () => {
    const done = picking({
      state: 'DONE',
      moves: [move({ uomName: 'kg', demand: 0.3, quantity: 0.3, lines: [line({ quantity: 0.1, uomName: 'kg' }), line({ quantity: 0.2, uomName: 'kg' })] })],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([['Treadmill', '0.3 kg', '0.3 kg']]);
  });

  it('prints the whole picking description on a lot line', () => {
    const done = picking({
      state: 'DONE',
      moves: [move({ descriptionPicking: 'Treadmill\nFragile', lines: [line({ lotName: 'L1' })] })],
    });

    expect(tableOf(buildDeliverySlip([done], {}, UTC).blocks)?.rows).toEqual([['Treadmill\nTreadmill\nFragile', 'L1', '2 Units']]);
  });

  it('names the customer company of a person and delivers to the first move\'s contact', () => {
    const delivery = picking({
      partnerName: 'Ann Lee',
      commercialPartnerName: 'Gym A',
      commercialPartnerAddress: '1 Main St',
      deliveryPartnerName: 'Gym A Depot',
      deliveryPartnerAddress: '7 Dock Rd',
    });

    expect(fieldsOf(buildDeliverySlip([delivery], {}, UTC).blocks)).toEqual(
      expect.arrayContaining([
        ['Delivery Address', 'Gym A Depot\n7 Dock Rd'],
        ['Customer', 'Gym A\n1 Main St'],
      ]),
    );
    expect(fieldsOf(buildPickingOperations([delivery], {}, UTC).blocks)).toEqual(
      expect.arrayContaining([
        ['Delivery Address:', 'Gym A Depot\n7 Dock Rd'],
        ['Customer Address:', 'Gym A'],
      ]),
    );
  });

  it('names the vendor by the company of the person on a receipt', () => {
    const receipt = picking({ pickingTypeCode: 'INCOMING', partnerName: 'Bo Chan', commercialPartnerName: 'Supplier B', commercialPartnerAddress: '5 Port Rd' });

    expect(fieldsOf(buildPickingOperations([receipt], {}, UTC).blocks)).toContainEqual(['Vendor:', 'Supplier B']);
    expect(fieldsOf(buildDeliverySlip([receipt], {}, UTC).blocks)).toContainEqual(['Vendor Address', 'Supplier B\n5 Port Rd']);
  });

  it('says so when a signed slip could not load its signature', () => {
    const blocks = buildDeliverySlip([picking({ state: 'DONE', signatureFailed: true })], {}, UTC).blocks;

    expect(blocks.slice(-3)).toEqual([
      { kind: 'heading', text: 'Signature' },
      { kind: 'text', text: 'The signature could not be loaded.' },
      { kind: 'text', text: 'Gym A' },
    ]);
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

describe('productBarcodeSymbology', () => {
  it('prints a number with a valid check digit as the retail code of its length', () => {
    expect(productBarcodeSymbology('4006381333931')).toBe('ean13');
    expect(productBarcodeSymbology('036000291452')).toBe('upca');
    expect(productBarcodeSymbology('96385074')).toBe('ean8');
  });

  it('prints anything else as Code 128', () => {
    expect(productBarcodeSymbology('4006381333932')).toBe('code128');
    expect(productBarcodeSymbology('TM-100')).toBe('code128');
    expect(productBarcodeSymbology('123456')).toBe('code128');
  });
});
