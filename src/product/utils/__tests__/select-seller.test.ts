import { describe, expect, it } from 'vitest';

import { resolveUoms } from 'src/uom/utils/uom.util';
import { selectSeller } from 'src/product/utils/select-seller.util';
import { type SellerLine } from 'src/product/utils/types/seller-line.type';

const { resolved } = resolveUoms([
  { id: 'Units', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
  { id: 'Pack6', name: 'Pack of 6', relativeUomId: 'Units', relativeFactor: 6, seedKey: null },
]);
const units = resolved.get('Units')!;

const line = (id: string, partnerId: string, sequence: number, minQty: number, price: number): SellerLine => ({
  id,
  createdAt: `2026-10-0${id.length}T00:00:00.000Z`,
  partnerId,
  sequence,
  minQty,
  price,
  discount: 0,
  productUomId: 'Units',
  productTmplId: 'P',
  productId: null,
  dateStart: null,
  dateEnd: null,
});
const lines = [line('a', 'V1', 1, 0, 10), line('bb', 'V1', 1, 100, 7), line('ccc', 'V2', 2, 0, 5)];
const pick = (quantity: number) =>
  selectSeller({ lines, variantId: 'Pv', productUom: units, quantity, uom: null, date: '2026-10-08', units: resolved, digits: 2 })?.id;

describe('selectSeller', () => {
  it('the lowest sequence picks the vendor, even when another vendor is cheaper', () => {
    expect(pick(10)).toBe('a');
  });

  it('inside that vendor, the cheapest line the quantity reaches wins', () => {
    expect(pick(100)).toBe('bb');
  });

  it('skips lines outside their dates', () => {
    const dated = [{ ...lines[0], dateEnd: '2026-10-07' }, lines[2]];
    expect(selectSeller({ lines: dated, variantId: 'Pv', productUom: units, quantity: 10, uom: null, date: '2026-10-08', units: resolved, digits: 2 })?.id).toBe('ccc');
  });

  it('skips a line for another variant', () => {
    const other = [{ ...lines[0], productId: 'Other' }];
    expect(selectSeller({ lines: other, variantId: 'Pv', productUom: units, quantity: 10, uom: null, date: '2026-10-08', units: resolved, digits: 2 })).toBeNull();
  });

  const ask = (values: Partial<Parameters<typeof selectSeller>[0]>) =>
    selectSeller({ lines, variantId: 'Pv', productUom: units, quantity: 10, uom: null, date: '2026-10-08', units: resolved, digits: 2, ...values })?.id;

  it('keeps a line on its last day and on its first day, also when the date carries a time', () => {
    const edge = [{ ...lines[0], dateStart: '2026-10-08', dateEnd: '2026-10-08' }];
    expect(ask({ lines: edge, date: '2026-10-08T15:30:00.000Z' })).toBe('a');
    expect(ask({ lines: edge, date: '2026-10-09T00:00:00.000Z' })).toBeUndefined();
  });

  it('with no unit asked, compares the raw quantity to the minimum, whatever the line unit', () => {
    const packLine = [{ ...lines[1], productUomId: 'Pack6', minQty: 2 }];
    expect(ask({ lines: packLine, quantity: 2 })).toBe('bb');
    expect(ask({ lines: packLine, quantity: 1 })).toBeUndefined();
  });

  it('a unit asked is converted to the line unit: 12 units = 2 packs reach a minimum of 2 packs', () => {
    const packLine = [{ ...lines[1], productUomId: 'Pack6', minQty: 2 }];
    expect(ask({ lines: packLine, quantity: 12, uom: units })).toBe('bb');
    expect(ask({ lines: packLine, quantity: 6, uom: units })).toBeUndefined();
  });

  it('inside a vendor, prices of lines in other units are compared per product unit: 54 per pack = 9 per unit beats 10', () => {
    const mixed = [{ ...lines[0], id: 'u', price: 10 }, { ...lines[0], id: 'p', productUomId: 'Pack6', price: 54 }];
    expect(ask({ lines: mixed })).toBe('p');
  });
});
