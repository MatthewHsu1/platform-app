import { describe, expect, it } from 'vitest';

import {
  duplicatedSerialQuantIds,
  moveLotTotals,
  movesInOut,
  nextSerialOfSequence,
  oneYearBefore,
  packageContentSummary,
  reorderingSummary,
} from 'src/stock/utils/record-facts.util';

describe('nextSerialOfSequence', () => {
  it('pads the next number of the lot sequence', () => {
    expect(nextSerialOfSequence({ numberNext: 42, padding: 7 })).toBe('0000042');
  });
  it('starts at 0000001 without a sequence', () => {
    expect(nextSerialOfSequence(null)).toBe('0000001');
  });
});

describe('oneYearBefore', () => {
  it('goes back one calendar year, a leap day landing on the last day of February', () => {
    expect(oneYearBefore('2026-10-08T12:00:00.000Z')).toBe('2025-10-08T12:00:00.000Z');
    expect(oneYearBefore('2028-02-29T08:30:00.000Z')).toBe('2027-02-28T08:30:00.000Z');
  });
});

describe('movesInOut', () => {
  it('counts the done lines of receipts as in and of deliveries as out', () => {
    expect(
      movesInOut([
        { pickingTypeCode: 'INCOMING', count: 5 },
        { pickingTypeCode: 'OUTGOING', count: 4 },
        { pickingTypeCode: 'INTERNAL', count: 12 },
        { pickingTypeCode: null, count: 30 },
      ]),
    ).toEqual({ movesIn: 5, movesOut: 4 });
  });
});

describe('reorderingSummary', () => {
  const groups = [
    { productId: 'v1', count: 2, minSum: 5, maxSum: 20 },
    { productId: 'v2', count: 1, minSum: 3, maxSum: 9 },
  ];
  it('sums the counts and min/max of a variant', () => {
    expect(reorderingSummary([groups[0]], false)).toEqual({ nbrReorderingRules: 2, reorderingMinQty: 5, reorderingMaxQty: 20 });
  });
  it('on a product adds the counts but keeps the last variant min/max', () => {
    expect(reorderingSummary(groups, true)).toEqual({ nbrReorderingRules: 3, reorderingMinQty: 3, reorderingMaxQty: 9 });
  });
});

describe('duplicatedSerialQuantIds', () => {
  it('flags every quant of a serial held positive in two internal or transit places', () => {
    expect(
      duplicatedSerialQuantIds([
        { id: 'a', lotId: 'SN1', tracking: 'SERIAL', quantity: 1, locationUsage: 'INTERNAL' },
        { id: 'b', lotId: 'SN1', tracking: 'SERIAL', quantity: 1, locationUsage: 'TRANSIT' },
        { id: 'c', lotId: 'SN1', tracking: 'SERIAL', quantity: 0, locationUsage: 'CUSTOMER' },
        { id: 'd', lotId: 'SN2', tracking: 'SERIAL', quantity: 1, locationUsage: 'INTERNAL' },
        { id: 'e', lotId: 'L1', tracking: 'LOT', quantity: 3, locationUsage: 'INTERNAL' },
        { id: 'f', lotId: 'L1', tracking: 'LOT', quantity: 3, locationUsage: 'INTERNAL' },
      ]),
    ).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('packageContentSummary', () => {
  it('groups contained quants by unit and product, sums weight and finds one owner', () => {
    expect(
      packageContentSummary({
        locale: 'en',
        baseWeight: 1.5,
        childBaseWeights: [0.5],
        directQuants: [
          { productId: 'belt', productName: 'Belt', uomName: 'Units', quantity: 2, productWeight: 0.25, ownerId: 'acme' },
        ],
        childQuants: [
          { productId: 'belt', productName: 'Belt', uomName: 'Units', quantity: 1, productWeight: 0.25, ownerId: 'acme' },
          { productId: 'oil', productName: 'Oil', uomName: 'L', quantity: 0.5, productWeight: 1, ownerId: null },
        ],
      }),
    ).toEqual({
      lines: [
        { productId: 'belt', productName: 'Belt', uomName: 'Units', quantity: 3 },
        { productId: 'oil', productName: 'Oil', uomName: 'L', quantity: 0.5 },
      ],
      description: '3 Units Belt and 0.5 L Oil',
      weight: 3.25,
      ownerId: 'acme',
    });
  });
});

describe('moveLotTotals', () => {
  it('lists the lots of the lines that hold a quantity, with their quantities summed', () => {
    expect(
      moveLotTotals([
        { lotId: 'l1', lotName: 'LOT-1', quantity: 2 },
        { lotId: null, lotName: '', quantity: 4 },
        { lotId: 'l2', lotName: 'LOT-2', quantity: 0 },
        { lotId: 'l1', lotName: 'LOT-1', quantity: 3 },
        { lotId: 'l3', lotName: 'LOT-3', quantity: 1 },
      ]),
    ).toEqual([
      { lotId: 'l1', name: 'LOT-1', quantity: 5 },
      { lotId: 'l3', name: 'LOT-3', quantity: 1 },
    ]);
  });
});
