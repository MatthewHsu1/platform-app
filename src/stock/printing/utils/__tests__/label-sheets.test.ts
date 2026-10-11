import { describe, expect, it } from 'vitest';

import { lotLabelSheet, productLabelSheet } from 'src/stock/printing/utils/label-sheets.util';

const belt = { name: 'Belt', defaultCode: 'BELT', barcode: '123', price: '$5.00', quantity: 3 };

describe('productLabelSheet', () => {
  it('repeats each product by its quantity on a 2 x 7 sheet with the price', () => {
    const sheet = productLabelSheet([belt], 'PRICE_2X7', '');

    expect({ columns: sheet.columns, rows: sheet.rows, cells: sheet.cells.length }).toEqual({ columns: 2, rows: 7, cells: 3 });
    expect({ width: sheet.pageWidthMm, height: sheet.pageHeightMm }).toEqual({ width: 210, height: 297 });
    expect(sheet.cells[0]).toEqual([
      { kind: 'heading', text: 'Belt' },
      { kind: 'text', text: 'BELT' },
      { kind: 'barcode', symbology: 'code128', value: '123', caption: '123', widthMm: 33, heightMm: 14 },
      { kind: 'text', text: '$5.00' },
    ]);
  });

  it('puts the extra content above the price on the 2 x 7 sheet', () => {
    expect(productLabelSheet([belt], 'PRICE_2X7', 'Sale!').cells[0][3]).toEqual({ kind: 'text', text: 'Sale!' });
  });

  it('prints the price before the reference on a 4 x 7 sheet, which has no extra content', () => {
    expect(productLabelSheet([belt], 'PRICE_4X7', 'Sale!').cells[0]).toEqual([
      { kind: 'heading', text: 'Belt' },
      { kind: 'text', text: '$5.00' },
      { kind: 'text', text: 'BELT' },
      { kind: 'barcode', symbology: 'code128', value: '123', caption: '123', widthMm: 33, heightMm: 8 },
    ]);
  });

  it('prints name, reference and barcode on a plain 4 x 12 sheet', () => {
    const sheet = productLabelSheet([{ ...belt, barcode: '4006381333931' }], 'PLAIN_4X12', '');

    expect({ columns: sheet.columns, rows: sheet.rows, width: sheet.cellWidthMm, height: sheet.cellHeightMm }).toEqual({
      columns: 4,
      rows: 12,
      width: 43,
      height: 19,
    });
    expect(sheet.cells[0]).toEqual([
      { kind: 'heading', text: 'Belt' },
      { kind: 'text', text: 'BELT' },
      { kind: 'barcode', symbology: 'ean13', value: '4006381333931', caption: '4006381333931', widthMm: 33, heightMm: 4 },
    ]);
  });

  it('prints one Dymo label per page, barcode first and the price at the bottom', () => {
    const sheet = productLabelSheet([{ ...belt, quantity: 2 }], 'DYMO', '');

    expect({ width: sheet.pageWidthMm, height: sheet.pageHeightMm, cells: sheet.cells.length }).toEqual({ width: 57, height: 32, cells: 2 });
    expect(sheet.cells[0]).toEqual([
      { kind: 'barcode', symbology: 'code128', value: '123', caption: '123', widthMm: 45.5, heightMm: 7.5 },
      { kind: 'heading', text: 'Belt' },
      { kind: 'text', text: 'BELT' },
      { kind: 'text', text: '$5.00' },
    ]);
  });

  it('leaves out an empty reference and barcode, and prints a name Code 128 cannot hold as text', () => {
    expect(productLabelSheet([{ ...belt, defaultCode: '', barcode: '' }], 'PLAIN_4X12', '').cells[0]).toEqual([
      { kind: 'heading', text: 'Belt' },
    ]);
    expect(productLabelSheet([{ ...belt, barcode: '批次1' }], 'PLAIN_4X12', '').cells[0][2]).toEqual({ kind: 'text', text: '批次1' });
  });
});

describe('lotLabelSheet', () => {
  it('prints reference, product and lot with the lot barcode on a 4 x 12 sheet', () => {
    const sheet = lotLabelSheet([{ defaultCode: 'TM', productName: 'Treadmill', lotName: 'SN1' }]);

    expect({ columns: sheet.columns, rows: sheet.rows }).toEqual({ columns: 4, rows: 12 });
    expect(sheet.cells[0]).toEqual([
      { kind: 'text', text: '[TM]' },
      { kind: 'text', text: 'Treadmill' },
      { kind: 'text', text: 'SN1' },
      { kind: 'barcode', symbology: 'code128', value: 'SN1', widthMm: 35, heightMm: 6 },
    ]);
  });
});
