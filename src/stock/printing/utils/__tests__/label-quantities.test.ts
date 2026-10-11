import { describe, expect, it } from 'vitest';

import {
  LABEL_ERRORS,
  checkLabelProducts,
  labelGrid,
  labelPrintOrder,
  labelQuantities,
  lotLabelLotIds,
  lotLabelOptions,
} from 'src/stock/printing/utils/label-quantities.util';

describe('labelGrid', () => {
  it('reads columns and rows from the format', () => {
    expect(labelGrid('PRICE_2X7')).toEqual({ columns: 2, rows: 7, priceIncluded: true, isZpl: false });
    expect(labelGrid('PLAIN_4X12')).toEqual({ columns: 4, rows: 12, priceIncluded: false, isZpl: false });
    expect(labelGrid('DYMO')).toEqual({ columns: 1, rows: 1, priceIncluded: false, isZpl: false });
    expect(labelGrid('ZPL_PRICE')).toEqual({ columns: 1, rows: 1, priceIncluded: true, isZpl: true });
  });
});

describe('labelQuantities', () => {
  it('prints the copies asked for each product', () => {
    expect(labelQuantities({ moveQuantity: 'CUSTOM', customQuantity: 3, productIds: ['a', 'b'], moves: [] }).quantityByProduct).toEqual(
      new Map([
        ['a', 3],
        ['b', 3],
      ]),
    );
  });

  it('refuses zero copies and an empty selection', () => {
    expect(() => labelQuantities({ moveQuantity: 'CUSTOM', customQuantity: 0, productIds: ['a'], moves: [] })).toThrow(
      LABEL_ERRORS.positiveQuantity,
    );
    expect(() => labelQuantities({ moveQuantity: 'CUSTOM', customQuantity: 1, productIds: [], moves: [] })).toThrow(
      LABEL_ERRORS.noProduct,
    );
  });

  it('uses the reserved quantity, else the demand, when no line has a quantity', () => {
    const result = labelQuantities({
      moveQuantity: 'MOVE',
      customQuantity: 1,
      productIds: ['a', 'b'],
      moves: [
        { productId: 'a', quantity: 2, demand: 5, lines: [{ productId: 'a', quantity: 0, lotName: '', isUnitLike: true }] },
        { productId: 'b', quantity: 0, demand: 4, lines: [] },
      ],
    });

    expect(result.quantityByProduct).toEqual(
      new Map([
        ['a', 2],
        ['b', 4],
      ]),
    );
  });

  it('counts lines: one label per unit under the lot name, quantities without lot, 1 for other units', () => {
    const result = labelQuantities({
      moveQuantity: 'MOVE',
      customQuantity: 1,
      productIds: ['a', 'b'],
      moves: [
        {
          productId: 'a',
          quantity: 5,
          demand: 5,
          lines: [
            { productId: 'a', quantity: 2, lotName: 'L1', isUnitLike: true },
            { productId: 'a', quantity: 3, lotName: '', isUnitLike: true },
          ],
        },
        { productId: 'b', quantity: 2.5, demand: 3, lines: [{ productId: 'b', quantity: 2.5, lotName: '', isUnitLike: false }] },
      ],
    });

    expect(result.quantityByProduct).toEqual(
      new Map([
        ['a', 3],
        ['b', 1],
      ]),
    );
    expect(result.customBarcodes).toEqual(new Map([['a', [['L1', 2]]]]));
  });
});

describe('checkLabelProducts', () => {
  it('refuses to label a service', () => {
    expect(() => checkLabelProducts([{ isService: false }, { isService: true }])).toThrow(LABEL_ERRORS.serviceProduct);
    expect(() => checkLabelProducts([{ isService: false }])).not.toThrow();
  });
});

describe('labelPrintOrder', () => {
  const names = new Map([
    ['belt', { sortName: 'Belt', barcode: 'B-1' }],
    ['apple', { sortName: 'Apple', barcode: 'A-1' }],
    ['mat', { sortName: 'Mat', barcode: '' }],
  ]);
  const quantityByProduct = new Map([
    ['belt', 2],
    ['apple', 1],
  ]);
  const customBarcodes = new Map<string, [string, number][]>([
    [
      'belt',
      [
        ['L1', 2],
        ['L2', 1],
      ],
    ],
    ['mat', [['M1', 1]]],
  ]);

  it('fills a sheet with the lot-only products first, then by name, each product last lot first', () => {
    expect(labelPrintOrder({ products: names, quantityByProduct, customBarcodes, layout: 'SHEET' })).toEqual([
      { productId: 'mat', barcode: 'M1', quantity: 1 },
      { productId: 'apple', barcode: 'A-1', quantity: 1 },
      { productId: 'belt', barcode: 'L2', quantity: 1 },
      { productId: 'belt', barcode: 'L1', quantity: 2 },
      { productId: 'belt', barcode: 'B-1', quantity: 2 },
    ]);
  });

  it('prints Dymo labels by name from Z to A, each product before its lots', () => {
    expect(labelPrintOrder({ products: names, quantityByProduct, customBarcodes, layout: 'DYMO' })).toEqual([
      { productId: 'belt', barcode: 'B-1', quantity: 2 },
      { productId: 'belt', barcode: 'L1', quantity: 2 },
      { productId: 'belt', barcode: 'L2', quantity: 1 },
      { productId: 'apple', barcode: 'A-1', quantity: 1 },
      { productId: 'mat', barcode: 'M1', quantity: 1 },
    ]);
  });

  it('prints ZPL labels in the order counted, the lots after their product', () => {
    expect(labelPrintOrder({ products: names, quantityByProduct, customBarcodes, layout: 'ZPL' })).toEqual([
      { productId: 'belt', barcode: 'B-1', quantity: 2 },
      { productId: 'belt', barcode: 'L1', quantity: 2 },
      { productId: 'belt', barcode: 'L2', quantity: 1 },
      { productId: 'apple', barcode: 'A-1', quantity: 1 },
      { productId: 'mat', barcode: 'M1', quantity: 1 },
    ]);
  });
});

describe('lot labels', () => {
  it('prints one label per lot, or one per unit of each lot', () => {
    const lines = [
      { lotId: 'L1', quantity: 2, isUnitLike: true },
      { lotId: 'L2', quantity: 1.5, isUnitLike: false },
      { lotId: null, quantity: 4, isUnitLike: true },
    ];

    expect(lotLabelLotIds({ labelQuantity: 'LOTS', lines })).toEqual(['L1', 'L2']);
    expect(lotLabelLotIds({ labelQuantity: 'UNITS', lines })).toEqual(['L1', 'L1', 'L2']);
  });

  it('reads the auto-print lot format', () => {
    expect(lotLabelOptions('ZPL_UNITS')).toEqual({ labelQuantity: 'UNITS', printFormat: 'ZPL' });
    expect(lotLabelOptions('LOTS_4X12')).toEqual({ labelQuantity: 'LOTS', printFormat: '4X12' });
  });
});
