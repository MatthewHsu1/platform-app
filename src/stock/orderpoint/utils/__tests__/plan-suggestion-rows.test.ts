import { describe, expect, it } from 'vitest';

import { planSuggestionRows } from 'src/stock/orderpoint/utils/plan-suggestion-rows.util';

const base = {
  locationWarehouseIds: new Map<string, string | null>([
    ['wh2-stock', 'WH2'],
    ['loose', null],
  ]),
  firstWarehouseId: 'WH1',
};

describe('planSuggestionRows', () => {
  it("makes a row for a pair without a rule, in the location's warehouse", () => {
    expect(planSuggestionRows({ ...base, toRefill: [{ productId: 'super', locationId: 'wh2-stock' }], orderpoints: [] })).toEqual([
      { productId: 'super', locationId: 'wh2-stock', warehouseId: 'WH2' },
    ]);
  });

  it('uses the first warehouse for a location outside every warehouse', () => {
    expect(planSuggestionRows({ ...base, toRefill: [{ productId: 'super', locationId: 'loose' }], orderpoints: [] })).toEqual([
      { productId: 'super', locationId: 'loose', warehouseId: 'WH1' },
    ]);
  });

  it('never makes a second row for a pair that already has a rule, archived or trashed ones too', () => {
    expect(
      planSuggestionRows({
        ...base,
        toRefill: [{ productId: 'super', locationId: 'wh2-stock' }],
        orderpoints: [{ productId: 'super', locationId: 'wh2-stock' }],
      }),
    ).toEqual([]);
  });
});
