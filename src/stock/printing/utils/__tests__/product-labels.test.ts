import { describe, expect, it } from 'vitest';

import { type Pricelist } from 'src/product/utils/types/pricelist.type';
import { type PricelistRule } from 'src/product/utils/types/pricelist-rule.type';
import { type LabelProduct } from 'src/stock/printing/types/label-product.type';
import { type LabelSheet } from 'src/stock/printing/types/label-sheet.type';
import { LABEL_ERRORS } from 'src/stock/printing/utils/label-quantities.util';
import {
  buildProductLabels,
  formatLabelMoney,
  labelUnitPrice,
  productLabelsFileName,
  variantLabelName,
} from 'src/stock/printing/utils/product-labels.util';

const UNITS = { id: 'units', name: 'Units', factor: 1, rootId: 'units', parentPath: 'units/' };
const PACK_OF_6 = { id: 'pack', name: 'Pack of 6', factor: 6, rootId: 'units', parentPath: 'units/pack/' };
const NOW = new Date('2026-10-10T12:00:00Z');

const variant = (overrides: Partial<LabelProduct> = {}): LabelProduct => ({
  id: 'v1',
  isVariant: true,
  templateName: 'Treadmill',
  name: '[TM-1] Treadmill (Red, XL)',
  defaultCode: 'TM-1',
  barcode: 'TM1',
  isService: false,
  priced: {
    templateId: 't1',
    variantId: 'v1',
    templateVariantIds: ['v1'],
    categPath: null,
    uom: UNITS,
    currencyCode: 'USD',
    listPrice: 10,
    priceExtra: 2.5,
    standardPrice: 4,
  },
  referenceUnitName: null,
  ...overrides,
});

const fixedRule = (fixedPrice: number): PricelistRule => ({
  id: 'r1',
  createdAt: '2026-01-01T00:00:00Z',
  appliedOn: 'GLOBAL',
  categPath: null,
  categCompleteName: null,
  productTmplId: null,
  productId: null,
  minQuantity: 0,
  dateStart: null,
  dateEnd: null,
  base: 'LIST_PRICE',
  basePricelistId: null,
  computePrice: 'FIXED',
  fixedPrice,
  percentPrice: 0,
  priceDiscount: 0,
  priceMarkup: 0,
  priceRound: 0,
  priceSurcharge: 0,
  priceMinMargin: 0,
  priceMaxMargin: 0,
});

const sale: Pricelist = { id: 'p1', name: 'Sale', currencyCode: 'USD', rules: [fixedRule(7)] };

describe('variantLabelName', () => {
  it('drops the internal reference and reads the attribute values from the variant name', () => {
    expect(variantLabelName({ name: '[TM-1] Treadmill (Red, XL)', defaultCode: 'TM-1', templateName: 'Treadmill' })).toEqual({
      labelName: 'Treadmill (Red, XL)',
      attributes: 'Red, XL',
    });
    expect(variantLabelName({ name: 'Mat', defaultCode: '', templateName: 'Mat' })).toEqual({ labelName: 'Mat', attributes: '' });
  });
});

describe('labelUnitPrice', () => {
  it('prints the sales price with the variant extra when no pricelist is chosen', () => {
    const { price, currencyCode } = labelUnitPrice({ product: variant(), pricelists: new Map(), pricelistId: null, now: NOW });

    expect(formatLabelMoney(price, currencyCode)).toBe('$12.50');
  });

  it('prints the chosen pricelist price', () => {
    expect(labelUnitPrice({ product: variant(), pricelists: new Map([['p1', sale]]), pricelistId: 'p1', now: NOW })).toEqual({
      price: 7,
      currencyCode: 'USD',
    });
  });
});

describe('buildProductLabels', () => {
  it('prints the copies asked for of each selected variant, name without its reference', () => {
    const sheet = buildProductLabels({ products: [variant()], moves: null, pricelists: [] }, { format: 'PRICE_4X12', copies: 2 }, NOW) as LabelSheet;

    expect(sheet.cells).toHaveLength(2);
    expect(sheet.cells[0]).toEqual([
      { kind: 'heading', text: 'Treadmill (Red, XL)' },
      { kind: 'text', text: 'TM-1' },
      { kind: 'text', text: '$12.50' },
      { kind: 'barcode', symbology: 'code128', value: 'TM1', caption: 'TM1', widthMm: 33, heightMm: 4 },
    ]);
  });

  it('refuses a service and zero copies', () => {
    expect(() => buildProductLabels({ products: [variant({ isService: true })], moves: null, pricelists: [] }, {}, NOW)).toThrow(
      LABEL_ERRORS.serviceProduct,
    );
    expect(() => buildProductLabels({ products: [variant()], moves: null, pricelists: [] }, { copies: 0 }, NOW)).toThrow(
      LABEL_ERRORS.positiveQuantity,
    );
  });

  it('labels a transfer by its operation quantities, the lot names as their own labels', () => {
    const sheet = buildProductLabels(
      {
        products: [variant()],
        moves: [
          {
            productId: 'v1',
            quantity: 3,
            demand: 3,
            lines: [
              { productId: 'v1', quantity: 2, lotName: 'SN-7', isUnitLike: true },
              { productId: 'v1', quantity: 1, lotName: '', isUnitLike: true },
            ],
          },
        ],
        pricelists: [],
      },
      { format: 'PLAIN_4X12' },
      NOW,
    ) as LabelSheet;

    expect(sheet.cells.map((cell) => cell[2])).toEqual([
      { kind: 'barcode', symbology: 'code128', value: 'SN-7', caption: 'SN-7', widthMm: 33, heightMm: 4 },
      { kind: 'barcode', symbology: 'code128', value: 'SN-7', caption: 'SN-7', widthMm: 33, heightMm: 4 },
      { kind: 'barcode', symbology: 'code128', value: 'TM1', caption: 'TM1', widthMm: 33, heightMm: 4 },
    ]);
  });

  it('writes a variant ZPL label with the reference and template name, then the values, then the price', () => {
    const output = buildProductLabels(
      { products: [variant()], moves: null, pricelists: [sale] },
      { format: 'ZPL_PRICE', zplTemplate: 'normal', pricelistId: 'p1' },
      NOW,
    );

    expect(output).toEqual({
      kind: 'zpl',
      text: '\n\n^XA^CI28\n\n^FT35,40^A0N,25^FD[TM-1] Treadmill^FS\n^FT35,65^A0N,20^FDRed, XL^FS\n^FO35,77^BY2 ^BCN,100,Y,N,N ^FDTM1^FS\n^FO300,200 ^A0N,40^FH ^FD$7.00^FS\n^XZ\n',
    });
  });

  it('adds the price per reference unit on a ZPL label of a product sold in packs', () => {
    const output = buildProductLabels(
      {
        products: [variant({ priced: { ...variant().priced, uom: PACK_OF_6, listPrice: 12, priceExtra: 0 }, referenceUnitName: 'Units' })],
        moves: null,
        pricelists: [],
      },
      { format: 'ZPL_PRICE', zplTemplate: 'normal' },
      NOW,
    );

    expect(output.kind === 'zpl' ? output.text : '').toContain('^FO150,210 ^A0N,25^FH ^FD( $2.00 / Units )^FS');
  });

  it('prints the template name alone on a small ZPL label', () => {
    const output = buildProductLabels({ products: [variant()], moves: null, pricelists: [] }, { format: 'ZPL', zplTemplate: 'small' }, NOW);

    expect(output).toEqual({ kind: 'zpl', text: '\n\n^XA^CI28\n\n^FT35,30^A0N,20^FDTreadmill^FS\n^FO35,50^BY1 ^BCN,80,Y,N,N ^FDTM1^FS\n^XZ\n' });
  });
});

describe('productLabelsFileName', () => {
  it('names the print after the report of its format', () => {
    expect(productLabelsFileName({ format: 'PLAIN_4X12' })).toBe('Product Label 4x12 No Price (PDF)');
    expect(productLabelsFileName({})).toBe('Product Label 2x7 (PDF)');
    expect(productLabelsFileName({ format: 'ZPL_PRICE' })).toBe('Product Label (ZPL)');
  });
});
