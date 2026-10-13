import { describe, expect, it } from 'vitest';

import { comboBasePrice, comboItemRefusal, comboSplit } from 'src/product/utils/combo-split.util';

describe('comboSplit', () => {
  it('shares the combo price by the choices base prices', () => {
    expect(comboSplit({ comboPrice: 12, choices: [{ id: 'A', basePrice: 2 }, { id: 'B', basePrice: 4 }] })).toEqual(
      new Map([['A', 4], ['B', 8]]),
    );
  });

  it('shares evenly when every base price is 0 and puts the rounding rest on the last choice', () => {
    expect(
      comboSplit({ comboPrice: 10, choices: [{ id: 'A', basePrice: 0 }, { id: 'B', basePrice: 0 }, { id: 'C', basePrice: 0 }] }),
    ).toEqual(new Map([['A', 3.33], ['B', 3.33], ['C', 3.34]]));
  });

  it('refuses a combo with no choice', () => {
    expect(() => comboSplit({ comboPrice: 10, choices: [] })).toThrow('A combo product needs at least one combo choice.');
  });
});

describe('comboBasePrice', () => {
  it('is the cheapest item, or 0 with no items', () => {
    expect(comboBasePrice([4, 2.5, 9])).toBe(2.5);
    expect(comboBasePrice([])).toBe(0);
  });
});

describe('comboItemRefusal', () => {
  it('refuses a combo inside a combo and a duplicate product', () => {
    expect(comboItemRefusal({ itemProductType: 'COMBO', duplicateInChoice: false })).toBe('A combo item cannot be a combo product.');
    expect(comboItemRefusal({ itemProductType: 'CONSU', duplicateInChoice: true })).toBe('This product is already in this combo choice.');
    expect(comboItemRefusal({ itemProductType: 'CONSU', duplicateInChoice: false })).toBeNull();
  });
});
