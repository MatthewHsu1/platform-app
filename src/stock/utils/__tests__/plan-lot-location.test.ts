import { describe, expect, it } from 'vitest';

import {
  LOT_IN_SEVERAL_LOCATIONS,
  planLotLocationRepairs,
  planLotRelocation,
  planLotSummary,
} from 'src/stock/utils/plan-lot-location.util';

describe('planLotSummary', () => {
  const scope = new Set(['A', 'B', 'C']);

  it('gives the location when all positive stock of the lot is in one place', () => {
    expect(
      planLotSummary({
        quants: [
          { locationId: 'A', quantity: 1 },
          { locationId: 'vendors', quantity: -1 },
        ],
        scopeLocationIds: scope,
      }),
    ).toEqual({ locationId: 'A', productQty: 1 });
  });

  it('gives no location when the lot is in two places', () => {
    expect(
      planLotSummary({
        quants: [
          { locationId: 'A', quantity: 1 },
          { locationId: 'C', quantity: 10 },
        ],
        scopeLocationIds: scope,
      }),
    ).toEqual({ locationId: null, productQty: 11 });
  });

  it('counts on hand only inside the warehouses', () => {
    expect(planLotSummary({ quants: [{ locationId: 'customers', quantity: 4 }], scopeLocationIds: scope })).toEqual({
      locationId: 'customers',
      productQty: 0,
    });
  });
});

describe('planLotRelocation', () => {
  it('moves the lot when it sits in one location', () => {
    expect(
      planLotRelocation({
        quants: [{ id: 'q1', locationId: 'A', quantity: 1, packageId: null }],
        packageQuantCounts: new Map(),
        newLocationId: 'B',
      }),
    ).toEqual({ kind: 'move', quantIds: ['q1'], unpack: false });
  });

  it('unpacks when its package holds more than this lot', () => {
    expect(
      planLotRelocation({
        quants: [{ id: 'q1', locationId: 'A', quantity: 1, packageId: 'pk' }],
        packageQuantCounts: new Map([['pk', 2]]),
        newLocationId: 'B',
      }),
    ).toEqual({ kind: 'move', quantIds: ['q1'], unpack: true });
  });

  it('refuses a lot that sits in several locations', () => {
    expect(
      planLotRelocation({
        quants: [
          { id: 'q1', locationId: 'A', quantity: 10, packageId: null },
          { id: 'q2', locationId: 'C', quantity: 10, packageId: null },
        ],
        packageQuantCounts: new Map(),
        newLocationId: 'B',
      }),
    ).toEqual({ kind: 'refuse', reason: LOT_IN_SEVERAL_LOCATIONS });
  });

  it('does nothing for a lot without stock', () => {
    expect(planLotRelocation({ quants: [], packageQuantCounts: new Map(), newLocationId: 'B' })).toEqual({ kind: 'nothing' });
  });

  it('moves the stock where it already is when the location is cleared', () => {
    expect(
      planLotRelocation({
        quants: [{ id: 'q1', locationId: 'A', quantity: 1, packageId: null }],
        packageQuantCounts: new Map(),
        newLocationId: null,
      }),
    ).toEqual({ kind: 'move', quantIds: ['q1'], unpack: false });
  });

  it('does nothing when all its stock already sits in the new location', () => {
    expect(
      planLotRelocation({
        quants: [
          { id: 'q1', locationId: 'B', quantity: 1, packageId: null },
          { id: 'q2', locationId: 'A', quantity: -1, packageId: null },
        ],
        packageQuantCounts: new Map(),
        newLocationId: 'B',
      }),
    ).toEqual({ kind: 'nothing' });
  });
});

describe('planLotLocationRepairs', () => {
  it('names the lots whose location is not where their stock is, and leaves correct and claimed lots alone', () => {
    expect(
      planLotLocationRepairs({
        lots: [
          { id: 'shownOnShelf', locationId: 'shelf' },
          { id: 'shownNowhere', locationId: null },
          { id: 'split', locationId: 'A' },
          { id: 'correct', locationId: 'A' },
          { id: 'claimed', locationId: 'shelf' },
        ],
        quants: [
          { lotId: 'shownOnShelf', locationId: 'stock', quantity: 3 },
          { lotId: 'shownNowhere', locationId: 'B', quantity: 1 },
          { lotId: 'split', locationId: 'A', quantity: 1 },
          { lotId: 'split', locationId: 'C', quantity: 2 },
          { lotId: 'correct', locationId: 'A', quantity: 5 },
          { lotId: 'correct', locationId: 'vendors', quantity: -5 },
          { lotId: 'claimed', locationId: 'stock', quantity: 1 },
        ],
        heldLotIds: new Set(['claimed']),
      }),
    ).toEqual(['shownOnShelf', 'shownNowhere', 'split']);
  });

  it('keeps the location typed on a lot that holds no stock', () => {
    expect(
      planLotLocationRepairs({
        lots: [{ id: 'empty', locationId: 'B' }],
        quants: [{ lotId: 'empty', locationId: 'A', quantity: 0 }],
        heldLotIds: new Set(),
      }),
    ).toEqual([]);
  });
});
