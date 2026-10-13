import { describe, expect, it } from 'vitest';

import { planVariantActiveOnOrderpoints } from 'src/stock/orderpoint/utils/plan-variant-active-on-orderpoints.util';

describe('planVariantActiveOnOrderpoints', () => {
  it("archives an archived variant's rules and leaves rules already archived alone", () => {
    expect(
      planVariantActiveOnOrderpoints({
        variants: [{ id: 'A', active: false }],
        rules: [
          { id: 'op-1', productId: 'A', active: true },
          { id: 'op-2', productId: 'A', active: false },
        ],
      }),
    ).toEqual([{ id: 'op-1', active: false }]);
  });

  it("unarchives every rule of an unarchived variant, archived ones included", () => {
    expect(
      planVariantActiveOnOrderpoints({
        variants: [{ id: 'A', active: true }],
        rules: [
          { id: 'op-1', productId: 'A', active: false },
          { id: 'op-2', productId: 'A', active: false },
        ],
      }),
    ).toEqual([
      { id: 'op-1', active: true },
      { id: 'op-2', active: true },
    ]);
  });

  it('leaves the rules of other variants alone', () => {
    expect(
      planVariantActiveOnOrderpoints({
        variants: [{ id: 'A', active: false }],
        rules: [{ id: 'op-b', productId: 'B', active: true }],
      }),
    ).toEqual([]);
  });
});
