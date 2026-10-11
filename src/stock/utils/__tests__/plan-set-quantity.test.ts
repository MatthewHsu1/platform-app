import { describe, expect, it } from 'vitest';

import { planSetQuantity } from 'src/stock/utils/plan-set-quantity.util';
import { type SetQuantityInput } from 'src/stock/utils/types/set-quantity-input.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const UOMS = new Map<string, ResolvedUom>([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['dozen', { id: 'dozen', name: 'Dozens', factor: 12, rootId: 'unit', parentPath: 'unit/dozen/' }],
]);

const base: SetQuantityInput = {
  target: 8,
  moveUomId: 'unit',
  productUomId: 'unit',
  moveLocationId: 'stock',
  bypassReservation: false,
  lines: [{ id: 'l1', quantity: 1, productUomId: 'unit', key: 'p|shelf1|||', createdAt: '2026-10-08T10:00:00.000Z' }],
  freeByKey: new Map([['p|shelf1|||', 3]]),
  quants: [
    { key: 'p|shelf1|||', locationId: 'shelf1', ownerId: null, free: 3 },
    { key: 'p|shelf2|||', locationId: 'shelf2', ownerId: null, free: 3 },
  ],
  uoms: UOMS,
  digits: 2,
};

describe('planSetQuantity', () => {
  it('grows the line from its own key, then reserves elsewhere, then puts the rest on a plain line', () => {
    expect(planSetQuantity(base)).toEqual({
      update: [{ lineId: 'l1', quantity: 4 }],
      destroy: [],
      create: [
        { quantKey: 'p|shelf2|||', locationId: 'shelf2', ownerId: null, quantity: 3, productUomId: 'unit' },
        { quantKey: null, locationId: 'stock', ownerId: null, quantity: 1, productUomId: 'unit' },
      ],
    });
  });

  it('shrinks the newest lines first and destroys a line taken to zero', () => {
    expect(
      planSetQuantity({
        ...base,
        target: 3,
        lines: [
          { id: 'l1', quantity: 4, productUomId: 'unit', key: 'p|shelf1|||', createdAt: '2026-10-08T10:00:00.000Z' },
          { id: 'l2', quantity: 3, productUomId: 'unit', key: 'p|shelf2|||', createdAt: '2026-10-08T10:01:00.000Z' },
          { id: 'l3', quantity: 1, productUomId: 'unit', key: 'p|stock|||', createdAt: '2026-10-08T10:02:00.000Z' },
        ],
      }),
    ).toEqual({ update: [{ lineId: 'l1', quantity: 3 }], destroy: ['l3', 'l2'], create: [] });
  });

  it('puts everything on one plain line when the source bypasses reservation', () => {
    expect(planSetQuantity({ ...base, target: 5, lines: [], bypassReservation: true })).toEqual({
      update: [],
      destroy: [],
      create: [{ quantKey: null, locationId: 'stock', ownerId: null, quantity: 5, productUomId: 'unit' }],
    });
  });

  it('makes reserved lines in the move unit when the quantity converts exactly, else in the product unit', () => {
    expect(
      planSetQuantity({
        ...base,
        target: 1,
        moveUomId: 'dozen',
        lines: [],
        quants: [
          { key: 'p|shelf1|||', locationId: 'shelf1', ownerId: null, free: 6 },
          { key: 'p|shelf2|||', locationId: 'shelf2', ownerId: null, free: 5 },
        ],
      }).create,
    ).toEqual([
      { quantKey: 'p|shelf1|||', locationId: 'shelf1', ownerId: null, quantity: 0.5, productUomId: 'dozen' },
      { quantKey: 'p|shelf2|||', locationId: 'shelf2', ownerId: null, quantity: 5, productUomId: 'unit' },
      { quantKey: null, locationId: 'stock', ownerId: null, quantity: 1 / 12, productUomId: 'dozen' },
    ]);
  });

  it('puts what stock cannot cover on one-unit lines for a serial product', () => {
    expect(planSetQuantity({ ...base, target: 3, lines: [], quants: [], tracking: 'SERIAL' }).create).toEqual([
      { quantKey: null, locationId: 'stock', ownerId: null, quantity: 1, productUomId: 'unit' },
      { quantKey: null, locationId: 'stock', ownerId: null, quantity: 1, productUomId: 'unit' },
      { quantKey: null, locationId: 'stock', ownerId: null, quantity: 1, productUomId: 'unit' },
    ]);
  });

  it('plans nothing when the lines already hold the target', () => {
    expect(planSetQuantity({ ...base, target: 1 })).toEqual({ update: [], destroy: [], create: [] });
  });
});
