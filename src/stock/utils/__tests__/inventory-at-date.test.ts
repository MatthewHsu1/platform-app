import { describe, expect, it } from 'vitest';

import {
  compareInventoryProducts,
  doneMovesAfter,
  inventoryAtDate,
  inventoryAtDatePage,
  matchesProductSearch,
} from 'src/stock/utils/inventory-at-date.util';

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

describe('inventory at date list order', () => {
  it('orders by internal reference, then name, then id, with no reference last', () => {
    const rows = [
      { id: '3', defaultCode: null, name: 'A' },
      { id: '2', defaultCode: 'B1', name: 'Z' },
      { id: '1', defaultCode: 'A1', name: 'Y' },
    ];

    expect([...rows].sort(compareInventoryProducts).map((row) => row.id)).toEqual(['1', '2', '3']);
  });
});

describe('inventory at date search', () => {
  it('finds a product by part of its name, whatever the case', () => {
    expect(matchesProductSearch({ name: 'Treadmill T1', defaultCode: null }, 'trEAD')).toBe(true);
  });

  it('finds a product by part of its internal reference', () => {
    expect(matchesProductSearch({ name: 'Bike', defaultCode: 'SF-100' }, 'sf-1')).toBe(true);
  });

  it('leaves out a product whose name and reference miss the text', () => {
    expect(matchesProductSearch({ name: 'Bike', defaultCode: null }, 'x')).toBe(false);
  });

  it('keeps every product when the search is blank', () => {
    expect(matchesProductSearch({ name: 'Bike', defaultCode: null }, '   ')).toBe(true);
  });
});

describe('inventory at date pages', () => {
  const rows = Array.from({ length: 161 }, (_, index) => index);

  it('answers 80 rows from the offset and says more follow', () => {
    expect(inventoryAtDatePage(rows, 80)).toEqual({ rows: rows.slice(80, 160), offset: 80, hasMore: true });
  });

  it('answers the last row alone on the last page', () => {
    expect(inventoryAtDatePage(rows, 160)).toEqual({ rows: [160], offset: 160, hasMore: false });
  });

  it('starts at the first row for a negative offset', () => {
    expect(inventoryAtDatePage(rows, -5)).toEqual({ rows: rows.slice(0, 80), offset: 0, hasMore: true });
  });
});
