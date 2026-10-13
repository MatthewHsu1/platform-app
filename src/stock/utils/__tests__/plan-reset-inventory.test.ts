import { describe, expect, it } from 'vitest';

import { planResetInventory } from 'src/stock/utils/plan-reset-inventory.util';

const USAGES = new Map([
  ['vendors', 'SUPPLIER' as const],
  ['stock', 'INTERNAL' as const],
  ['transit', 'TRANSIT' as const],
  ['customers', 'CUSTOMER' as const],
  ['inventory', 'INVENTORY' as const],
]);
const line = (locationId: string, locationDestId: string, quantityProductUom: number) => ({
  productId: 'p', locationId, locationDestId, ownerId: null, quantityProductUom,
});

describe('planResetInventory', () => {
  it('balances the history of each internal and transit key to zero', () => {
    expect(
      planResetInventory({
        doneLines: [line('vendors', 'stock', 12), line('stock', 'transit', 3), line('stock', 'customers', 5)],
        locationUsages: USAGES,
        onHand: new Map(),
        digits: 2,
      }),
    ).toEqual([
      { key: 'p|stock|||', delta: 4, count: 0 },
      { key: 'p|transit|||', delta: 3, count: 0 },
    ]);
  });

  it('leaves stock already on hand alone after tracking was off and on again', () => {
    expect(
      planResetInventory({
        doneLines: [line('inventory', 'stock', 10)],
        locationUsages: USAGES,
        onHand: new Map([['p|stock|||', 10]]),
        digits: 2,
      }),
    ).toEqual([]);
  });

  it('counts the stock on hand so only the moves it does not hold are balanced', () => {
    expect(
      planResetInventory({
        doneLines: [line('inventory', 'stock', 10), line('vendors', 'stock', 5)],
        locationUsages: USAGES,
        onHand: new Map([['p|stock|||', 10]]),
        digits: 2,
      }),
    ).toEqual([{ key: 'p|stock|||', delta: 5, count: 10 }]);
  });

  it('keeps the owner in the key', () => {
    expect(
      planResetInventory({
        doneLines: [{ ...line('vendors', 'stock', 2), ownerId: 'c1' }],
        locationUsages: USAGES,
        onHand: new Map(),
        digits: 2,
      }),
    ).toEqual([{ key: 'p|stock|||c1', delta: 2, count: 0 }]);
  });
});
