import { describe, expect, it } from 'vitest';

import {
  containsPattern,
  doneMovesAfter,
  doneMovesAfterInProductUnit,
  inventoryAtDate,
} from 'src/stock/utils/inventory-at-date.util';
import { computeQuantity, resolveUoms } from 'src/uom/utils/uom.util';

// 100 arrive from transit into stock, a pick moves 60 inside the warehouse,
// then 25 leave to the customer; on hand today is 75. Transit is outside the warehouse.
const scope = new Set(['view', 'stock', 'output']);
const moves = [
  { productId: 'P', date: '2026-09-30T10:00:00.000Z', quantityProductUom: 150, locationId: 'vendors', locationDestId: 'transit' },
  { productId: 'P', date: '2026-10-02T10:00:00.000Z', quantityProductUom: 100, locationId: 'transit', locationDestId: 'stock' },
  { productId: 'P', date: '2026-10-04T10:00:00.000Z', quantityProductUom: 60, locationId: 'stock', locationDestId: 'output' },
  { productId: 'P', date: '2026-10-06T10:00:00.000Z', quantityProductUom: 25, locationId: 'output', locationDestId: 'customers' },
];
const onHandAt = (at: string) => {
  const after = doneMovesAfter({ moves, scopeLocationIds: scope, at }).get('P') ?? { in: 0, out: 0 };
  return inventoryAtDate(75, after.in, after.out);
};

describe('inventory at date', () => {
  it('winds today back through the done moves after the date', () => {
    expect(onHandAt('2026-10-01T10:00:00.000Z')).toBe(0);
    expect(onHandAt('2026-10-03T10:00:00.000Z')).toBe(100);
    expect(onHandAt('2026-10-05T10:00:00.000Z')).toBe(100);
    expect(onHandAt('2026-10-07T10:00:00.000Z')).toBe(75);
  });

  it('ignores moves inside the warehouses and moves outside them', () => {
    expect(doneMovesAfter({ moves, scopeLocationIds: scope, at: '2026-09-01T00:00:00.000Z' }).get('P')).toEqual({ in: 100, out: 25 });
  });
});

describe('inventory at date in the product unit', () => {
  const units = resolveUoms([
    { id: 'unit', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
    { id: 'dozen', name: 'Dozens', relativeUomId: 'unit', relativeFactor: 12, seedKey: null },
  ]).resolved;
  const toDozens = (quantity: number, fromUomId: string) => {
    const from = units.get(fromUomId);
    const to = units.get('dozen');

    return from === undefined || to === undefined
      ? Number.NaN
      : computeQuantity({ qty: quantity, from, to, digits: 2, method: 'UP' });
  };
  const receipt = (date: string, quantity: number, productUomId: string) => ({
    productId: 'P',
    date,
    quantity,
    productUomId,
    locationId: 'vendors',
    locationDestId: 'stock',
  });

  it('converts the sum of the moves in one unit, not each move', () => {
    const moves = [
      receipt('2026-10-02T10:00:00.000Z', 1, 'unit'),
      receipt('2026-10-03T10:00:00.000Z', 1, 'unit'),
      receipt('2026-10-04T10:00:00.000Z', 1, 'unit'),
    ];
    const after = doneMovesAfterInProductUnit({ moves, scopeLocationIds: scope, at: '2026-10-01T00:00:00.000Z', toProductUnit: toDozens });

    expect(after.get('P')).toEqual({ in: 0.25, out: 0 });
    expect(inventoryAtDate(0.25, 0.25, 0)).toBe(0);
  });

  it('rounds each unit sum up into the product unit', () => {
    const moves = [receipt('2026-10-02T10:00:00.000Z', 1, 'dozen'), receipt('2026-10-03T10:00:00.000Z', 1, 'unit')];
    const after = doneMovesAfterInProductUnit({ moves, scopeLocationIds: scope, at: '2026-10-01T00:00:00.000Z', toProductUnit: toDozens });

    expect(after.get('P')).toEqual({ in: 1.09, out: 0 });
  });
});

describe('inventory at date search pattern', () => {
  it('finds the text anywhere and takes %, _ and \\ literally', () => {
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});
