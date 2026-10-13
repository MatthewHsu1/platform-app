import { describe, expect, it } from 'vitest';

import { planReservedRecompute } from 'src/stock/utils/plan-reserved-recompute.util';

// Rule: the nightly reservation clean-up compares each key's stored reserved quantity with the sum of
// its open lines and corrects only the keys that differ; a location that bypasses reservation holds none.
describe('planReservedRecompute', () => {
  it('picks the keys whose stored reserved quantity differs from their open lines', () => {
    expect(
      planReservedRecompute({
        digits: 2,
        bypassLocationIds: ['vendors'],
        reservedQuants: [
          { quantKey: 'p|stock|||', reservedQuantity: 5 },
          { quantKey: 'p|shelf|||', reservedQuantity: 5 },
          { quantKey: 'p|vendors|||', reservedQuantity: 2 },
          { quantKey: 'p|old|||', reservedQuantity: 4 },
          { quantKey: 'p|dust|||', reservedQuantity: 1.001 },
        ],
        openLines: [
          { key: 'p|stock|||', quantityProductUom: 2 },
          { key: 'p|stock|||', quantityProductUom: 3 },
          { key: 'p|shelf|||', quantityProductUom: 3 },
          { key: 'p|vendors|||', quantityProductUom: 2 },
          { key: 'p|dust|||', quantityProductUom: 1 },
          { key: 'p|new|||', quantityProductUom: 3 },
          { key: 'q|vendors|||', quantityProductUom: 3 },
        ],
      }),
    ).toEqual(['p|shelf|||', 'p|vendors|||', 'p|old|||', 'p|new|||']);
  });
});
