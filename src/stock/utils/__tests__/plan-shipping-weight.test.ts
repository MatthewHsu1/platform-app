import { describe, expect, it } from 'vitest';

import { planShippingWeight, planShippingWeightWrite } from 'src/stock/utils/plan-shipping-weight.util';

describe('planShippingWeight', () => {
  const box = { baseWeight: 5, shippingWeight: 0 };
  const pallet = { baseWeight: 10, shippingWeight: 0 };

  it('adds each outermost package, the packages headed into it, and their content', () => {
    expect(
      planShippingWeight({
        lines: [
          { resultPackageId: 'pallet', quantityProductUom: 5, productWeight: 2 },
          { resultPackageId: 'box', quantityProductUom: 3, productWeight: 2 },
        ],
        packages: [
          { id: 'pallet', packageDestId: null, ...pallet },
          { id: 'box', packageDestId: 'pallet', ...box },
        ],
      }),
    ).toBe(31);
    expect(
      planShippingWeight({
        lines: [{ resultPackageId: 'box2', quantityProductUom: 1, productWeight: 2 }],
        packages: [
          { id: 'pallet2', packageDestId: null, ...pallet },
          { id: 'box2', packageDestId: 'pallet2', ...box },
        ],
      }),
    ).toBe(17);
  });

  it('follows a package type change and a typed package weight', () => {
    const lines = [{ resultPackageId: 'box2', quantityProductUom: 1, productWeight: 2 }];

    expect(
      planShippingWeight({
        lines,
        packages: [
          { id: 'pallet2', packageDestId: null, ...pallet },
          { id: 'box2', packageDestId: 'pallet2', ...pallet },
        ],
      }),
    ).toBe(22);
    expect(
      planShippingWeight({
        lines,
        packages: [
          { id: 'pallet2', packageDestId: null, baseWeight: 10, shippingWeight: 40 },
          { id: 'box2', packageDestId: 'pallet2', ...box },
        ],
      }),
    ).toBe(40);
  });

  it('counts lines without a package by their product weight', () => {
    expect(planShippingWeight({ lines: [{ resultPackageId: null, quantityProductUom: 4, productWeight: 1.5 }], packages: [] })).toBe(6);
  });
});

describe('planShippingWeightWrite', () => {
  it('writes when the computed weight changes, and keeps a typed weight otherwise', () => {
    expect(planShippingWeightWrite({ computed: 31, storedComputed: null, storedShippingWeight: null })).toEqual({
      shippingWeight: 31,
      shippingWeightComputed: 31,
    });
    expect(planShippingWeightWrite({ computed: 31, storedComputed: 31, storedShippingWeight: 35 })).toEqual({});
    expect(planShippingWeightWrite({ computed: 22, storedComputed: 17, storedShippingWeight: 35 })).toEqual({
      shippingWeight: 22,
      shippingWeightComputed: 22,
    });
  });
});
