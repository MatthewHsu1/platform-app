import { describe, expect, it } from 'vitest';

import { pickRemovalStrategy, planLeastPackages, removalOrder } from 'src/stock/removal/removal-order';
import { REMOVAL_METHOD } from 'src/stock/routing-options.constant';
import { type RemovalMethod } from 'src/stock/removal/types/removal-method.type';
import { type RemovalQuant } from 'src/stock/removal/types/removal-quant.type';

const quant = (id: string, values: Partial<RemovalQuant> = {}): RemovalQuant => ({
  id,
  inDate: '2026-10-01T00:00:00.000Z',
  locationCompleteName: 'WH/Stock',
  lotId: null,
  packageId: null,
  quantity: 1,
  reservedQuantity: 0,
  ...values,
});

// One receipt made this stock: it posts the loose stock first, then the newest
// package first. Every quant shares the receipt's incoming date, so the quant
// ids, given in that order, decide the order reservation takes them in.
const stock = (rows: [number | null, number][]) => {
  const loose: RemovalQuant[] = [];
  const packages: { packageId: string; quantity: number }[] = [];

  for (const [packageSize, count] of rows) {
    if (packageSize === null) {
      loose.push(quant('', { quantity: count }));
      continue;
    }
    for (let index = 0; index < count; index += 1) {
      packages.push({ packageId: `p${String(packages.length + 1).padStart(2, '0')}`, quantity: packageSize });
    }
  }

  return [...loose, ...packages.reverse().map((row) => quant('', row))].map((row, index) => ({
    ...row,
    id: `q${String(index).padStart(2, '0')}`,
  }));
};

// The lines reservation makes from the narrowed quants: in removal order, min(free, still needed).
const reserve = (quants: RemovalQuant[], wanted: number) => {
  const lines: number[] = [];
  let left = wanted;

  for (const candidate of removalOrder(quants, REMOVAL_METHOD.LEAST_PACKAGES)) {
    if (left <= 0) {
      break;
    }
    const taken = Math.min(candidate.quantity - candidate.reservedQuantity, left);
    lines.push(taken);
    left -= taken;
  }

  return lines;
};

const ids = (quants: RemovalQuant[]) => quants.map((row) => row.id);

describe('pickRemovalStrategy', () => {
  it('uses the category strategy before any location strategy', () => {
    expect(pickRemovalStrategy('LIFO', ['CLOSEST', 'FIFO'])).toBe('LIFO');
  });

  it('uses the first strategy walking up from the source location', () => {
    expect(pickRemovalStrategy(null, [null, 'CLOSEST', 'LIFO'])).toBe('CLOSEST');
  });

  it('falls back to first in, first out', () => {
    expect(pickRemovalStrategy(null, [null, null])).toBe('FIFO');
  });
});

describe('removalOrder', () => {
  const older = quant('a', { inDate: '2026-01-01T00:00:00.000Z' });
  const newer = quant('b', { inDate: '2026-02-01T00:00:00.000Z' });

  it('takes the oldest stock first for FIFO and least packages', () => {
    expect(ids(removalOrder([newer, older], 'FIFO'))).toEqual(['a', 'b']);
    expect(ids(removalOrder([newer, older], 'LEAST_PACKAGES'))).toEqual(['a', 'b']);
  });

  it('takes the newest stock first for LIFO', () => {
    expect(ids(removalOrder([older, newer], 'LIFO'))).toEqual(['b', 'a']);
  });

  it('breaks a tie on the incoming date by creation order, before the id', () => {
    const createdFirst = quant('b', { createdAt: '2026-10-01T08:00:00.000Z' });
    const createdLater = quant('a', { createdAt: '2026-10-01T09:00:00.000Z' });

    expect(ids(removalOrder([createdLater, createdFirst], 'FIFO'))).toEqual(['b', 'a']);
    expect(ids(removalOrder([createdFirst, createdLater], 'LIFO'))).toEqual(['a', 'b']);
  });

  it('breaks a tie on the incoming date and creation time by the id', () => {
    expect(ids(removalOrder([quant('b'), quant('a')], 'FIFO'))).toEqual(['a', 'b']);
    expect(ids(removalOrder([quant('a'), quant('b')], 'LIFO'))).toEqual(['b', 'a']);
  });

  // The database sorts an empty value after every date in ascending order and before them in descending order.
  it('takes stock with no incoming date last for FIFO and first for LIFO', () => {
    const undated = quant('c', { inDate: null });

    expect(ids(removalOrder([undated, newer, older], 'FIFO'))).toEqual(['a', 'b', 'c']);
    expect(ids(removalOrder([older, newer, undated], 'LIFO'))).toEqual(['c', 'b', 'a']);
  });

  it('takes the location whose full name sorts first for CLOSEST', () => {
    const shelf2 = quant('a', { locationCompleteName: 'WH/Stock/Shelf 2', quantity: 3 });
    const shelf1 = quant('b', { locationCompleteName: 'WH/Stock/Shelf 1', quantity: 2 });

    expect(ids(removalOrder([shelf2, shelf1], 'CLOSEST'))).toEqual(['b', 'a']);
  });

  it('takes the newest quant first within one location for CLOSEST', () => {
    const createdFirst = quant('b', { createdAt: '2026-10-01T08:00:00.000Z' });
    const createdLater = quant('a', { createdAt: '2026-10-01T09:00:00.000Z' });

    expect(ids(removalOrder([createdFirst, createdLater], 'CLOSEST'))).toEqual(['a', 'b']);
  });

  it('puts quants with a lot before quants without one', () => {
    const noLot = quant('a', { inDate: '2026-01-01T00:00:00.000Z' });
    const withLot = quant('b', { inDate: '2026-03-01T00:00:00.000Z', lotId: 'lot1' });

    expect(ids(removalOrder([noLot, withLot], 'FIFO'))).toEqual(['b', 'a']);
  });

  it('takes the lot to be removed first for FEFO, and stock without a lot last', () => {
    const noLot = quant('a', { inDate: '2026-01-01T00:00:00.000Z' });
    const removedLater = quant('b', { lotId: 'lot1', removalDate: '2026-03-20T00:00:00.000Z' });
    const removedSooner = quant('c', { lotId: 'lot2', inDate: '2026-02-01T00:00:00.000Z', removalDate: '2026-03-05T00:00:00.000Z' });

    expect(ids(removalOrder([noLot, removedLater, removedSooner], 'FEFO'))).toEqual(['c', 'b', 'a']);
  });

  it('refuses a method it does not know', () => {
    expect(() => removalOrder([older], 'RANDOM' as RemovalMethod)).toThrow('Removal strategy RANDOM not implemented.');
  });
});

describe('planLeastPackages', () => {
  it('returns the quants unchanged when no package holds stock', () => {
    const quants = stock([[null, 20]]);

    expect(planLeastPackages(quants, 5)).toEqual(quants);
  });

  it('returns the quants unchanged for a quantity of zero, packages or not', () => {
    const quants = stock([
      [null, 2],
      [5, 2],
    ]);

    expect(planLeastPackages(quants, 0)).toEqual(quants);
  });

  it('takes one package of 1000 rather than loose stock', () => {
    const narrowed = planLeastPackages(
      stock([
        [null, 2000],
        [5, 10],
        [50, 10],
        [1000, 2],
      ]),
      1000,
    );

    expect(reserve(narrowed, 1000)).toEqual([1000]);
    expect(narrowed.every((row) => row.packageId !== null)).toBe(true);
  });

  it('covers 1280 with one package of 1000, five of 50 and six of 5', () => {
    const narrowed = planLeastPackages(
      stock([
        [5, 10],
        [50, 10],
        [1000, 2],
      ]),
      1280,
    );

    expect(reserve(narrowed, 1280)).toEqual([1000, 50, 50, 50, 50, 50, 5, 5, 5, 5, 5, 5]);
  });

  it('takes the smallest extra package when no set of packages matches exactly', () => {
    const narrowed = planLeastPackages(
      stock([
        [null, 2],
        [5, 2],
        [10, 5],
      ]),
      13,
    );

    expect(narrowed.map((row) => row.quantity).sort((left, right) => right - left)).toEqual([10, 5]);
    expect(reserve(narrowed, 13)).toEqual([10, 3]);
  });

  it('gives every quant when the stock does not cover the quantity', () => {
    const narrowed = planLeastPackages(
      stock([
        [null, 2],
        [5, 2],
        [10, 5],
      ]),
      90,
    );

    expect(reserve(narrowed, 90)).toEqual([2, 10, 10, 10, 10, 10, 5, 5]);
  });

  it('takes the package made first of two that hold the same quantity', () => {
    const narrowed = planLeastPackages(
      [
        quant('q-new', { packageId: 'aaa', packageCreatedAt: '2026-10-05T00:00:00.000Z', quantity: 5 }),
        quant('q-old', { packageId: 'zzz', packageCreatedAt: '2026-10-01T00:00:00.000Z', quantity: 5 }),
      ],
      5,
    );

    expect(narrowed.map((row) => row.packageId)).toEqual(['zzz']);
  });
});
