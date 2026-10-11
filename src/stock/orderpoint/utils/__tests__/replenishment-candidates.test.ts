import { describe, expect, it } from 'vitest';

import { replenishmentCandidates } from 'src/stock/orderpoint/utils/replenishment-candidates.util';

// WH1 view > Stock > Replenish Location, and WH1 view > Side; Vendors and Customers outside.
const locationPaths = new Map([
  ['wh1', 'wh1/'],
  ['wh1-stock', 'wh1/wh1-stock/'],
  ['wh1-rep', 'wh1/wh1-stock/wh1-rep/'],
  ['wh1-side', 'wh1/wh1-side/'],
  ['wh2-stock', 'wh2/wh2-stock/'],
  ['wh3-stock', 'wh3/wh3-stock/'],
  ['customers', 'customers/'],
  ['vendors', 'vendors/'],
]);
const WH1_STOCK = { id: 'wh1-stock', parentPath: 'wh1/wh1-stock/' };
const WH1_SIDE = { id: 'wh1-side', parentPath: 'wh1/wh1-side/' };
const WH2_STOCK = { id: 'wh2-stock', parentPath: 'wh2/wh2-stock/' };
const WH3_STOCK = { id: 'wh3-stock', parentPath: 'wh3/wh3-stock/' };
const out = (productId: string, locationId: string, productQty: number) => ({
  productId,
  locationId,
  locationDestId: 'customers',
  locationFinalId: null,
  productQty,
});

describe('replenishmentCandidates', () => {
  it('finds a need at each warehouse stock that delivers a product it does not have', () => {
    const input = {
      replenishLocations: [WH2_STOCK, WH3_STOCK],
      locationPaths,
      quants: [],
      moves: [out('super', 'wh2-stock', 1), out('super', 'wh3-stock', 1)],
      digits: 2,
    };

    expect(replenishmentCandidates({ ...input, location: WH2_STOCK })).toEqual(['super']);
    expect(replenishmentCandidates({ ...input, location: WH3_STOCK })).toEqual(['super']);
  });

  it('puts the need on the replenish sub-location the delivery leaves from', () => {
    const rep = { id: 'wh1-rep', parentPath: 'wh1/wh1-stock/wh1-rep/' };

    expect(
      replenishmentCandidates({ location: rep, replenishLocations: [rep], locationPaths, quants: [], moves: [out('rep', 'wh1-rep', 3)], digits: 2 }),
    ).toEqual(['rep']);
  });

  it('counts a transfer between two replenish locations as a need at its source only', () => {
    const input = {
      replenishLocations: [WH1_STOCK, WH1_SIDE],
      locationPaths,
      quants: [],
      moves: [{ productId: 'desk', locationId: 'wh1-stock', locationDestId: 'wh1-side', locationFinalId: null, productQty: 3 }],
      digits: 2,
    };

    expect(replenishmentCandidates({ ...input, location: WH1_STOCK })).toEqual(['desk']);
    expect(replenishmentCandidates({ ...input, location: WH1_SIDE })).toEqual([]);
  });

  it('finds no need when stock below the location, or a receipt, covers the outgoing quantity', () => {
    const input = { location: WH1_STOCK, replenishLocations: [WH1_STOCK], locationPaths, digits: 2 };

    expect(
      replenishmentCandidates({ ...input, quants: [{ productId: 'desk', locationId: 'wh1-rep', quantity: 5 }], moves: [out('desk', 'wh1-stock', 3)] }),
    ).toEqual([]);
    expect(
      replenishmentCandidates({
        ...input,
        quants: [],
        moves: [
          out('desk', 'wh1-stock', 3),
          { productId: 'desk', locationId: 'vendors', locationDestId: 'wh1-stock', locationFinalId: null, productQty: 3 },
        ],
      }),
    ).toEqual([]);
  });

  it('does not count a receipt that only passes through on its way out of every replenish location', () => {
    expect(
      replenishmentCandidates({
        location: WH1_STOCK,
        replenishLocations: [WH1_STOCK],
        locationPaths,
        quants: [],
        moves: [
          out('desk', 'wh1-stock', 3),
          { productId: 'desk', locationId: 'vendors', locationDestId: 'wh1-stock', locationFinalId: 'customers', productQty: 3 },
        ],
        digits: 2,
      }),
    ).toEqual(['desk']);
  });

  it('counts a receipt at its destination when its final location is another replenish location', () => {
    expect(
      replenishmentCandidates({
        location: WH1_STOCK,
        replenishLocations: [WH1_STOCK, WH1_SIDE],
        locationPaths,
        quants: [],
        moves: [
          out('desk', 'wh1-stock', 3),
          { productId: 'desk', locationId: 'vendors', locationDestId: 'wh1-stock', locationFinalId: 'wh1-side', productQty: 3 },
        ],
        digits: 2,
      }),
    ).toEqual([]);
  });

  it('ignores a shortage smaller than the unit precision', () => {
    expect(
      replenishmentCandidates({
        location: WH1_STOCK,
        replenishLocations: [WH1_STOCK],
        locationPaths,
        quants: [{ productId: 'desk', locationId: 'wh1-stock', quantity: 2.999 }],
        moves: [out('desk', 'wh1-stock', 3)],
        digits: 2,
      }),
    ).toEqual([]);
  });
});
