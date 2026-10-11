import { describe, expect, it } from 'vitest';

import { reorderingStat, showsNextSerial } from 'src/stock/utils/inventory-facts-display.util';
import {
  duplicatedSerialQuantIds,
  moveLotTotals,
  movesInOut,
  nextSerialOfSequence,
  oneYearBefore,
  packageContentSummary,
  reorderingSummary,
  sortVariantsInListOrder,
} from 'src/stock/utils/record-facts.util';

describe('nextSerialOfSequence', () => {
  it('pads the next number of the lot sequence', () => {
    expect(nextSerialOfSequence({ numberNext: 42, padding: 7 })).toBe('0000042');
  });
  it('starts at 0000001 without a sequence', () => {
    expect(nextSerialOfSequence(null)).toBe('0000001');
  });
});

describe('showsNextSerial', () => {
  it('shows the next serial for products tracked by lot or serial number only', () => {
    expect(['SERIAL', 'LOT', 'NONE'].map(showsNextSerial)).toEqual([true, true, false]);
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

describe('reorderingStat', () => {
  it('shows min and max for exactly one rule, else the count of a storable product', () => {
    expect(reorderingStat({ nbrReorderingRules: 1, reorderingMinQty: 5, reorderingMaxQty: 20 }, true)).toEqual({ kind: 'minMax', min: 5, max: 20 });
    expect(reorderingStat({ nbrReorderingRules: 3, reorderingMinQty: 3, reorderingMaxQty: 9 }, true)).toEqual({ kind: 'count', count: 3 });
    expect(reorderingStat({ nbrReorderingRules: 0, reorderingMinQty: 0, reorderingMaxQty: 0 }, true)).toEqual({ kind: 'count', count: 0 });
    expect(reorderingStat({ nbrReorderingRules: 0, reorderingMinQty: 0, reorderingMaxQty: 0 }, false)).toBeNull();
  });
});

describe('sortVariantsInListOrder', () => {
  it('orders variants by internal reference, those without one last, then oldest first', () => {
    expect(
      sortVariantsInListOrder([
        { id: 'b', defaultCode: 'B', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'none', defaultCode: '', createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'a-new', defaultCode: 'A', createdAt: '2026-03-01T00:00:00.000Z' },
        { id: 'a-old', defaultCode: 'A', createdAt: '2026-02-01T00:00:00.000Z' },
        { id: 'null', defaultCode: null, createdAt: '2024-01-01T00:00:00.000Z' },
      ]).map((variant) => variant.id),
    ).toEqual(['a-old', 'a-new', 'b', 'null', 'none']);
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

  it('marks both shelves of a serial in two places, and neither once one shelf is empty', () => {
    const twoShelves = [
      { id: 'shelf2', lotId: 'SN1', tracking: 'SERIAL', quantity: 1, locationUsage: 'INTERNAL' },
      { id: 'shelf1', lotId: 'SN1', tracking: 'SERIAL', quantity: 1, locationUsage: 'INTERNAL' },
    ];
    expect(duplicatedSerialQuantIds(twoShelves)).toEqual(new Set(['shelf2', 'shelf1']));
    expect(duplicatedSerialQuantIds([{ ...twoShelves[0], quantity: 0 }, twoShelves[1]])).toEqual(new Set());
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
