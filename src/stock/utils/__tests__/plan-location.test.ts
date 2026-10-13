import { describe, expect, it } from 'vitest';

import { findLocationCycles, planLocationValues, planNextInventoryDate } from 'src/stock/utils/plan-location.util';
import { type LocationTreeRow } from 'src/stock/utils/types/location-tree-row.type';

const row = (id: string, name: string | null, locationId: string | null, usage = 'INTERNAL', extra: Partial<LocationTreeRow> = {}): LocationTreeRow => ({
  id,
  name,
  usage: usage as LocationTreeRow['usage'],
  locationId,
  completeName: null,
  parentPath: null,
  warehouseId: null,
  nextInventoryDate: null,
  replenishLocation: false,
  cyclicInventoryFrequency: 0,
  lastInventoryDate: null,
  ...extra,
});

const asMap = (updates: { id: string; data: Record<string, unknown> }[]) =>
  Object.fromEntries(updates.map((update) => [update.id, update.data]));

describe('planLocationValues', () => {
  const tree = [row('wh', 'WH', null, 'VIEW'), row('stock', 'Stock', 'wh'), row('shelf', 'Shelf 1', 'stock')];
  const warehouses = [{ id: 'w1', viewLocationId: 'wh', active: true }];

  it('writes the full name, the path and the warehouse of the location and everything under it', () => {
    expect(asMap(planLocationValues({ locations: tree, warehouses, rootIds: ['wh'], today: '2026-10-08' }))).toEqual({
      wh: { completeName: 'WH', parentPath: 'wh/', warehouseId: 'w1' },
      stock: { completeName: 'WH/Stock', parentPath: 'wh/stock/', warehouseId: 'w1' },
      shelf: { completeName: 'WH/Stock/Shelf 1', parentPath: 'wh/stock/shelf/', warehouseId: 'w1' },
    });
  });

  it('writes no full name for a location with no name, and nothing on the next pass', () => {
    const rows = [row('nameless', null, null, 'VIEW', { parentPath: 'nameless/' })];
    expect(planLocationValues({ locations: rows, warehouses: [], rootIds: ['nameless'], today: '2026-10-08' })).toEqual([]);
  });

  it('gives a view under a parent its own name only', () => {
    const rows = [row('virtual', 'Virtual Locations', null, 'VIEW'), row('sub', 'Partners', 'virtual', 'VIEW'), row('vendors', 'Vendors', 'sub', 'SUPPLIER')];
    const values = asMap(planLocationValues({ locations: rows, warehouses: [], rootIds: ['virtual'], today: '2026-10-08' }));
    expect(values.sub.completeName).toBe('Partners');
    expect(values.vendors.completeName).toBe('Partners/Vendors');
  });

  it('takes the deepest warehouse view when a warehouse sits inside another', () => {
    const rows = [
      row('outer', 'MTWH', null, 'VIEW'),
      row('outerStock', 'Stock', 'outer'),
      row('inner', 'WH', 'outerStock', 'VIEW'),
      row('innerStock', 'Stock', 'inner'),
    ];
    const values = asMap(
      planLocationValues({
        locations: rows,
        warehouses: [
          { id: 'outerWarehouse', viewLocationId: 'outer', active: true },
          { id: 'innerWarehouse', viewLocationId: 'inner', active: true },
        ],
        rootIds: ['outer'],
        today: '2026-10-08',
      }),
    );
    expect(values.innerStock.warehouseId).toBe('innerWarehouse');
    expect(values.outerStock.warehouseId).toBe('outerWarehouse');
  });

  it('clears replenishment on a location that is not internal', () => {
    const rows = [row('customers', 'Customers', null, 'CUSTOMER', { replenishLocation: true })];
    expect(asMap(planLocationValues({ locations: rows, warehouses: [], rootIds: ['customers'], today: '2026-10-08' })).customers).toEqual({
      completeName: 'Customers',
      parentPath: 'customers/',
      replenishLocation: false,
    });
  });

  it('writes nothing on a second pass', () => {
    const first = planLocationValues({ locations: tree, warehouses, rootIds: ['wh'], today: '2026-10-08' });
    const applied = tree.map((location) => ({ ...location, ...(first.find((update) => update.id === location.id)?.data ?? {}) }));
    expect(planLocationValues({ locations: applied as LocationTreeRow[], warehouses, rootIds: ['wh'], today: '2026-10-08' })).toEqual([]);
  });

  it('skips locations on a loop', () => {
    const rows = [row('a', 'A', 'b'), row('b', 'B', 'a'), row('c', 'C', null)];
    expect(findLocationCycles(rows).sort()).toEqual(['a', 'b']);
    expect(planLocationValues({ locations: rows, warehouses: [], rootIds: ['a', 'c'], today: '2026-10-08' }).map((update) => update.id)).toEqual(['c']);
  });
});

describe('planNextInventoryDate', () => {
  it('is today plus the frequency when the location was never counted', () => {
    expect(planNextInventoryDate({ usage: 'INTERNAL', cyclicInventoryFrequency: 2, lastInventoryDate: null, today: '2026-10-08' })).toBe('2026-10-10');
  });

  it('is tomorrow when the last count plus the frequency has passed, else last count plus frequency', () => {
    expect(planNextInventoryDate({ usage: 'INTERNAL', cyclicInventoryFrequency: 2, lastInventoryDate: '2026-10-03', today: '2026-10-08' })).toBe('2026-10-09');
    expect(planNextInventoryDate({ usage: 'TRANSIT', cyclicInventoryFrequency: 30, lastInventoryDate: '2026-10-01', today: '2026-10-08' })).toBe('2026-10-31');
  });

  it('is empty without a frequency or outside internal and transit locations', () => {
    expect(planNextInventoryDate({ usage: 'INTERNAL', cyclicInventoryFrequency: 0, lastInventoryDate: null, today: '2026-10-08' })).toBeNull();
    expect(planNextInventoryDate({ usage: 'CUSTOMER', cyclicInventoryFrequency: 2, lastInventoryDate: null, today: '2026-10-08' })).toBeNull();
  });
});
