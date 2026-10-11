import { describe, expect, it } from 'vitest';

import { planSplitMove } from 'src/stock/utils/plan-split-move.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const UOMS = new Map<string, ResolvedUom>([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['dozen', { id: 'dozen', name: 'Dozens', factor: 12, rootId: 'unit', parentPath: 'unit/dozen/' }],
]);

describe('planSplitMove', () => {
  it('splits 1 of 2 units off', () => {
    expect(planSplitMove({ productQty: 2, quantity: 1, moveUomId: 'unit', productUomId: 'unit', uoms: UOMS, digits: 2 })).toEqual({
      newDemand: 1,
      newUomId: 'unit',
      originalDemand: 1,
    });
  });

  it('keeps the dozen when half a dozen is left', () => {
    expect(planSplitMove({ productQty: 12, quantity: 6, moveUomId: 'dozen', productUomId: 'unit', uoms: UOMS, digits: 2 })).toEqual({
      newDemand: 0.5,
      newUomId: 'dozen',
      originalDemand: 0.5,
    });
  });

  it('falls back to the product unit when one unit does not convert to dozens at 2 decimals', () => {
    expect(planSplitMove({ productQty: 12, quantity: 1, moveUomId: 'dozen', productUomId: 'unit', uoms: UOMS, digits: 2 })).toEqual({
      newDemand: 1,
      newUomId: 'unit',
      originalDemand: 0.92,
    });
  });

  it('splits nothing for a zero quantity', () => {
    expect(planSplitMove({ productQty: 2, quantity: 0.001, moveUomId: 'unit', productUomId: 'unit', uoms: UOMS, digits: 2 })).toBeNull();
  });
});
