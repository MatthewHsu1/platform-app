import { describe, expect, it } from 'vitest';

import { quantKey } from 'src/stock/quant/quant-key';
import { planDoneLineCorrection } from 'src/stock/utils/plan-done-line-correction.util';
import { type CorrectionSide } from 'src/stock/utils/types/correction-side.type';

const key = (locationId: string, ownerId: string | null = null) =>
  quantKey({ productId: 'P', locationId, lotId: null, packageId: null, ownerId });

const side = (overrides: Partial<CorrectionSide> = {}): CorrectionSide => ({
  productId: 'P',
  locationId: 'shelf1',
  locationDestId: 'customers',
  ownerId: null,
  quantityProductUom: 1,
  ...overrides,
});

describe('planDoneLineCorrection', () => {
  it('moves the unit back to Shelf 1 and takes it from Shelf 2', () => {
    expect(planDoneLineCorrection({ before: side(), after: side({ locationId: 'shelf2' }), storable: true, digits: 2 })).toEqual({
      deltas: [
        { key: key('customers'), delta: -1, inDateFromKey: null },
        { key: key('shelf1'), delta: 1, inDateFromKey: key('customers') },
        { key: key('shelf2'), delta: -1, inDateFromKey: null },
        { key: key('customers'), delta: 1, inDateFromKey: null },
      ],
      freeKey: key('shelf2'),
    });
  });

  it('undoes the line of 1 and posts it again as 2', () => {
    expect(planDoneLineCorrection({ before: side(), after: side({ quantityProductUom: 2 }), storable: true, digits: 2 })).toEqual({
      deltas: [
        { key: key('customers'), delta: -1, inDateFromKey: null },
        { key: key('shelf1'), delta: 1, inDateFromKey: key('customers') },
        { key: key('shelf1'), delta: -2, inDateFromKey: null },
        { key: key('customers'), delta: 2, inDateFromKey: null },
      ],
      freeKey: key('shelf1'),
    });
  });

  it('undoes the line of 5 and posts it again as 4', () => {
    expect(
      planDoneLineCorrection({ before: side({ quantityProductUom: 5 }), after: side({ quantityProductUom: 4 }), storable: true, digits: 2 }),
    ).toEqual({
      deltas: [
        { key: key('customers'), delta: -5, inDateFromKey: null },
        { key: key('shelf1'), delta: 5, inDateFromKey: key('customers') },
        { key: key('shelf1'), delta: -4, inDateFromKey: null },
        { key: key('customers'), delta: 4, inDateFromKey: null },
      ],
      freeKey: key('shelf1'),
    });
  });

  it('swaps the owner key', () => {
    expect(
      planDoneLineCorrection({ before: side({ ownerId: 'p1' }), after: side({ ownerId: 'p2' }), storable: true, digits: 2 }).deltas,
    ).toEqual([
      { key: key('customers', 'p1'), delta: -1, inDateFromKey: null },
      { key: key('shelf1', 'p1'), delta: 1, inDateFromKey: key('customers', 'p1') },
      { key: key('shelf1', 'p2'), delta: -1, inDateFromKey: null },
      { key: key('customers', 'p2'), delta: 1, inDateFromKey: null },
    ]);
  });

  it('posts nothing for a product without stock levels, or when nothing changed', () => {
    expect(planDoneLineCorrection({ before: side(), after: side({ quantityProductUom: 3 }), storable: false, digits: 2 })).toEqual({
      deltas: [],
      freeKey: null,
    });
    expect(planDoneLineCorrection({ before: side(), after: side(), storable: true, digits: 2 })).toEqual({ deltas: [], freeKey: null });
  });
});

describe('planDoneLineCorrection with lots', () => {
  const lotKey = (locationId: string, lotId: string) => quantKey({ productId: 'P', locationId, lotId, packageId: null, ownerId: null });

  it('gives the old lot back to the source and sends the new lot out when the lot of a done line changes', () => {
    expect(
      planDoneLineCorrection({ before: side({ lotId: 'lot1' }), after: side({ lotId: 'lot2' }), storable: true, digits: 2 }),
    ).toEqual({
      deltas: [
        { key: lotKey('customers', 'lot1'), delta: -1, inDateFromKey: null },
        { key: lotKey('shelf1', 'lot1'), delta: 1, inDateFromKey: lotKey('customers', 'lot1') },
        { key: lotKey('shelf1', 'lot2'), delta: -1, inDateFromKey: null },
        { key: lotKey('customers', 'lot2'), delta: 1, inDateFromKey: null },
      ],
      freeKey: lotKey('shelf1', 'lot2'),
    });
  });
});
