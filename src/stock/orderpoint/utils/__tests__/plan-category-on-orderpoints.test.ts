import { describe, expect, it } from 'vitest';

import { planCategoryOnOrderpoints } from 'src/stock/orderpoint/utils/plan-category-on-orderpoints.util';

describe('planCategoryOnOrderpoints', () => {
  it("gives the rules of every variant of the product the product's category", () => {
    expect(
      planCategoryOnOrderpoints({
        templates: [{ id: 'T', categId: 'C-new' }],
        variants: [
          { id: 'A', productTmplId: 'T' },
          { id: 'B', productTmplId: 'T' },
        ],
        rules: [
          { id: 'op-a', productId: 'A', productCategoryId: 'C-old' },
          { id: 'op-b', productId: 'B', productCategoryId: 'C-old' },
          { id: 'op-b2', productId: 'B', productCategoryId: 'C-new' },
        ],
      }),
    ).toEqual([
      { id: 'op-a', productCategoryId: 'C-new' },
      { id: 'op-b', productCategoryId: 'C-new' },
    ]);
  });

  it('clears the category of the rules when the product has none', () => {
    expect(
      planCategoryOnOrderpoints({
        templates: [{ id: 'T', categId: null }],
        variants: [{ id: 'A', productTmplId: 'T' }],
        rules: [{ id: 'op-a', productId: 'A', productCategoryId: 'C-old' }],
      }),
    ).toEqual([{ id: 'op-a', productCategoryId: null }]);
  });

  it('leaves a rule alone when its product cannot be read', () => {
    expect(
      planCategoryOnOrderpoints({
        templates: [],
        variants: [{ id: 'A', productTmplId: 'T' }],
        rules: [{ id: 'op-a', productId: 'A', productCategoryId: 'C-old' }],
      }),
    ).toEqual([]);
  });
});
