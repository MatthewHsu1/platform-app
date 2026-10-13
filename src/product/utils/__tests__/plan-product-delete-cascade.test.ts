import { describe, expect, it } from 'vitest';

import { planProductDeleteCascade } from 'src/product/utils/plan-product-delete-cascade.util';

const EMPTY = {
  exclusionLinks: [],
  exclusions: [],
  valueLinks: [],
  templateAttributeValues: [],
  lines: [],
  variants: [],
  sellers: [],
  pricelistRules: [],
  tagLinks: [],
  packagingLinks: [],
  comboLinks: [],
};

describe('planProductDeleteCascade', () => {
  it('lists children before the rows they hang on, and leaves out empty groups', () => {
    expect(
      planProductDeleteCascade({
        ...EMPTY,
        lines: ['L1'],
        variants: ['V1', 'V2'],
        templateAttributeValues: ['P1'],
        sellers: ['S1'],
        comboLinks: ['C1'],
      }),
    ).toEqual([
      { kind: 'templateAttributeValues', ids: ['P1'] },
      { kind: 'lines', ids: ['L1'] },
      { kind: 'variants', ids: ['V1', 'V2'] },
      { kind: 'sellers', ids: ['S1'] },
      { kind: 'comboLinks', ids: ['C1'] },
    ]);
  });

  it('lists a row once and plans nothing for a product with no rows', () => {
    expect(planProductDeleteCascade({ ...EMPTY, variants: ['V1', 'V1'] })).toEqual([
      { kind: 'variants', ids: ['V1'] },
    ]);
    expect(planProductDeleteCascade(EMPTY)).toEqual([]);
  });
});
