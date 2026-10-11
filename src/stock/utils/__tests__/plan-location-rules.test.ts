import { describe, expect, it } from 'vitest';

import {
  isOwnAncestor,
  locationArchiveRefusal,
  locationUsageRefusal,
  planActiveCascade,
  planLocationDelete,
  replenishConflict,
  subtreeIds,
} from 'src/stock/utils/plan-location-rules.util';

const TREE = [
  { id: 'wh', locationId: null, active: true, usage: 'VIEW' as const, name: 'WH', completeName: 'WH', replenishLocation: false },
  { id: 'stock', locationId: 'wh', active: true, usage: 'INTERNAL' as const, name: 'Stock', completeName: 'WH/Stock', replenishLocation: true },
  { id: 'shelf', locationId: 'stock', active: true, usage: 'INTERNAL' as const, name: 'Shelf 1', completeName: 'WH/Stock/Shelf 1', replenishLocation: false },
  { id: 'bin', locationId: 'shelf', active: false, usage: 'INTERNAL' as const, name: 'Bin', completeName: 'WH/Stock/Shelf 1/Bin', replenishLocation: false },
  { id: 'input', locationId: 'wh', active: true, usage: 'INTERNAL' as const, name: 'Input', completeName: 'WH/Input', replenishLocation: false },
  { id: 'wh2', locationId: null, active: true, usage: 'VIEW' as const, name: 'WH2', completeName: 'WH2', replenishLocation: false },
  { id: 'stock2', locationId: 'wh2', active: true, usage: 'INTERNAL' as const, name: 'Stock', completeName: 'WH2/Stock', replenishLocation: true },
];

describe('subtreeIds', () => {
  it('lists the location and every location under it, archived ones too', () => {
    expect(subtreeIds('stock', TREE).sort()).toEqual(['bin', 'shelf', 'stock']);
  });

  it('finds the children of a location that is already gone from the list', () => {
    expect(subtreeIds('gone', [{ id: 'child', locationId: 'gone' }])).toEqual(['gone', 'child']);
  });
});

describe('isOwnAncestor', () => {
  it('is true when the new parent is under the location', () => {
    const moved = TREE.map((row) => (row.id === 'stock' ? { ...row, locationId: 'bin' } : row));
    expect(isOwnAncestor('stock', moved)).toBe(true);
  });

  it('is false for a normal move to another branch', () => {
    const moved = TREE.map((row) => (row.id === 'shelf' ? { ...row, locationId: 'input' } : row));
    expect(isOwnAncestor('shelf', moved)).toBe(false);
  });
});

describe('planActiveCascade', () => {
  it('archives every location under the archived one that is still active', () => {
    expect(planActiveCascade({ rootId: 'stock', active: false, rows: TREE })).toEqual(['shelf']);
  });

  it('unarchives the whole subtree', () => {
    expect(planActiveCascade({ rootId: 'stock', active: true, rows: TREE })).toEqual(['bin']);
  });
});

describe('locationArchiveRefusal', () => {
  const warehouses = [
    { name: 'Main', active: true, viewLocationId: 'wh', lotStockId: 'stock' },
    { name: 'Old', active: false, viewLocationId: 'wh2', lotStockId: 'stock2' },
  ];

  it('refuses archiving the stock location of an active warehouse', () => {
    expect(
      locationArchiveRefusal({ locationId: 'stock', locationName: 'WH/Stock', rows: TREE, warehouses, quants: [] }),
    ).toEqual({
      message: 'You cannot archive location {location} because it is used by warehouse {warehouse}',
      values: { location: 'WH/Stock', warehouse: 'Main' },
    });
  });

  it('allows the stock location of an archived warehouse', () => {
    expect(
      locationArchiveRefusal({ locationId: 'stock2', locationName: 'WH2/Stock', rows: TREE, warehouses, quants: [] }),
    ).toBeNull();
  });

  it('refuses when an internal location under it holds stock or a reservation, naming each once', () => {
    expect(
      locationArchiveRefusal({
        locationId: 'shelf',
        locationName: 'WH/Stock/Shelf 1',
        rows: TREE,
        warehouses,
        quants: [
          { locationId: 'bin', quantity: 0, reservedQuantity: 2 },
          { locationId: 'bin', quantity: 3, reservedQuantity: 0 },
          { locationId: 'shelf', quantity: 0, reservedQuantity: 0 },
        ],
      }),
    ).toEqual({
      message: "You can't disable locations {locations} because they still contain products.",
      values: { locations: 'WH/Stock/Shelf 1/Bin' },
    });
  });
});

describe('locationUsageRefusal', () => {
  it('refuses view while any stock row exists, even one at zero', () => {
    expect(locationUsageRefusal({ beforeUsage: 'INTERNAL', afterUsage: 'VIEW', quants: [{ quantity: 0 }] })).toEqual({
      message: "This location's usage cannot be changed to view as it contains products.",
      values: {},
    });
  });

  it('refuses any usage change while the location holds a positive quantity', () => {
    expect(locationUsageRefusal({ beforeUsage: 'INTERNAL', afterUsage: 'TRANSIT', quants: [{ quantity: 4 }] })).toEqual({
      message: "Internal locations having stock can't be converted",
      values: {},
    });
  });

  it('allows a change when only negative or zero rows exist', () => {
    expect(locationUsageRefusal({ beforeUsage: 'INTERNAL', afterUsage: 'TRANSIT', quants: [{ quantity: -1 }, { quantity: 0 }] })).toBeNull();
  });
});

describe('replenishConflict', () => {
  it('refuses a second replenish location in the same warehouse tree, a sibling included', () => {
    const rows = TREE.map((row) => (row.id === 'input' ? { ...row, replenishLocation: true } : row));
    expect(replenishConflict({ locationId: 'input', rows })).toEqual({
      message: 'Another parent/sub replenish location {location} exists, if you wish to change it, uncheck it first',
      values: { location: 'Stock' },
    });
  });

  it('refuses a replenish location below another one', () => {
    const rows = TREE.map((row) => (row.id === 'shelf' ? { ...row, replenishLocation: true } : row));
    expect(replenishConflict({ locationId: 'shelf', rows })?.values).toEqual({ location: 'Stock' });
  });

  it('ignores replenish locations of another warehouse and archived ones', () => {
    expect(replenishConflict({ locationId: 'stock2', rows: TREE })).toBeNull();
    const rows = TREE.map((row) =>
      row.id === 'stock' ? { ...row, active: false } : row.id === 'input' ? { ...row, replenishLocation: true } : row,
    );
    expect(replenishConflict({ locationId: 'input', rows })).toBeNull();
  });
});

describe('planLocationDelete', () => {
  it('refuses when any location of the subtree is used', () => {
    expect(planLocationDelete({ deletedId: 'stock', rows: TREE, usedLocationIds: ['bin'] })).toEqual({ kind: 'refuse' });
  });

  it('deletes the locations under it otherwise', () => {
    expect(planLocationDelete({ deletedId: 'shelf', rows: TREE, usedLocationIds: ['stock'] })).toEqual({
      kind: 'cascade',
      childIds: ['bin'],
    });
  });
});
