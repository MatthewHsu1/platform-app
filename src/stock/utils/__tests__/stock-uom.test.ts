import { describe, expect, it } from 'vitest';

import { compareAtDigits, convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const uoms = new Map<string, ResolvedUom>([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['dozen', { id: 'dozen', name: 'Dozens', factor: 12, rootId: 'unit', parentPath: 'unit/dozen/' }],
  ['kg', { id: 'kg', name: 'kg', factor: 1000, rootId: 'g', parentPath: 'g/kg/' }],
]);

describe('convertQuantity', () => {
  it('converts dozens to units', () => {
    expect(convertQuantity({ qty: 10, fromUomId: 'dozen', toUomId: 'unit', uoms, digits: 2 })).toBe(120);
  });

  it('rounds half up by default and down when asked', () => {
    expect(convertQuantity({ qty: 6, fromUomId: 'unit', toUomId: 'dozen', uoms, digits: 0 })).toBe(1);
    expect(convertQuantity({ qty: 6, fromUomId: 'unit', toUomId: 'dozen', uoms, digits: 0, method: 'DOWN' })).toBe(0);
    expect(convertQuantity({ qty: 7, fromUomId: 'unit', toUomId: 'dozen', uoms, digits: 2 })).toBe(0.58);
  });

  it('refuses units of different trees', () => {
    expect(() => convertQuantity({ qty: 1, fromUomId: 'unit', toUomId: 'kg', uoms, digits: 2 })).toThrow(
      'Cannot convert Units to kg',
    );
  });
});

describe('compareAtDigits and isZeroAtDigits', () => {
  it('treats differences below the precision as equal', () => {
    expect(compareAtDigits(2.999, 3, 2)).toBe(0);
    expect(compareAtDigits(0.006, 0, 2)).toBe(1);
    expect(compareAtDigits(4, 5, 2)).toBe(-1);
    expect(isZeroAtDigits(0.004, 2)).toBe(true);
    expect(isZeroAtDigits(-0.006, 2)).toBe(false);
  });
});
