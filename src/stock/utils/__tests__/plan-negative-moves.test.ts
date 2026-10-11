import { describe, expect, it } from 'vitest';

import { planNegativeMoves } from 'src/stock/utils/plan-negative-moves.util';

describe('planNegativeMoves', () => {
  it('swaps the locations, flips the demand, uses the return type and rebuilds the links', () => {
    expect(
      planNegativeMoves([
        {
          id: 'neg',
          productUomQty: -3,
          locationId: 'stock',
          locationDestId: 'customers',
          pickingTypeId: 'out',
          returnPickingTypeId: 'in',
          linked: [
            { id: 'upstream', locationId: 'stock', locationDestId: 'customers', productUomQty: 3 },
            { id: 'downstream', locationId: 'stock', locationDestId: 'output', productUomQty: 2 },
            { id: 'unrelated', locationId: 'output', locationDestId: 'packing', productUomQty: 1 },
          ],
        },
        {
          id: 'pos',
          productUomQty: 4,
          locationId: 'stock',
          locationDestId: 'customers',
          pickingTypeId: 'out',
          returnPickingTypeId: null,
          linked: [],
        },
      ]),
    ).toEqual([
      {
        moveId: 'neg',
        data: {
          locationId: 'customers',
          locationDestId: 'stock',
          locationFinalId: 'stock',
          productUomQty: 3,
          pickingTypeId: 'in',
          procureMethod: 'MAKE_TO_STOCK',
          pickingId: null,
        },
        moveOrigIds: ['upstream'],
        moveDestIds: ['downstream'],
      },
    ]);
  });

  it('keeps the type when it has no return type', () => {
    const [result] = planNegativeMoves([
      { id: 'neg', productUomQty: -1, locationId: 'a', locationDestId: 'b', pickingTypeId: 'int', returnPickingTypeId: null, linked: [] },
    ]);

    expect(result.data.pickingTypeId).toBe('int');
  });
});
