import { describe, expect, it } from 'vitest';

import { planMoveLineCreate } from 'src/stock/utils/plan-move-line-create.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const UOMS = new Map<string, ResolvedUom>([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['dozen', { id: 'dozen', name: 'Dozens', factor: 12, rootId: 'unit', parentPath: 'unit/dozen/' }],
]);
const USAGES = new Map([
  ['stock', 'INTERNAL' as const],
  ['customers', 'CUSTOMER' as const],
  ['vendors', 'SUPPLIER' as const],
]);
const PRODUCT = { productId: 'p', uomId: 'unit', isStorable: true, displayName: 'Bolt' };
const READY_PICKING = {
  id: 'out1', name: 'WH/OUT/00001', state: 'ASSIGNED' as const, locationId: 'stock', locationDestId: 'customers',
  pickingTypeId: 'type-out', ownerId: null, companyId: 'c1', personId: null,
};
const line = (overrides: Record<string, unknown> = {}) => ({
  id: 'l1', productId: 'p', productUomId: null, quantity: 1, quantityProductUom: null, picked: false,
  pickingId: 'out1', moveId: null, locationId: null, locationDestId: null, ownerId: null, state: 'DRAFT' as const,
  name: null, ...overrides,
});
const move = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1', productId: 'p', productUomId: 'unit', quantity: 0, productQty: 1, picked: false,
  state: 'CONFIRMED' as const, locationId: 'stock', locationDestId: 'customers', pickingId: 'out1',
  reference: 'WH/OUT/00001', ...overrides,
});

describe('planMoveLineCreate', () => {
  it('links a line typed on a transfer to the move of the product that still needs quantity', () => {
    const plan = planMoveLineCreate({
      line: line(),
      move: null,
      picking: READY_PICKING,
      pickingMoves: [
        move({ id: 'm-full', quantity: 2, productQty: 2, state: 'ASSIGNED' }),
        move({ id: 'm-short', quantity: 0, productQty: 3 }),
      ],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan).toEqual({
      newMove: null,
      moveId: 'm-short',
      lineData: {
        moveId: 'm-short',
        productUomId: 'unit',
        locationId: 'stock',
        locationDestId: 'customers',
        quantityProductUom: 1,
        state: 'CONFIRMED',
        name: 'WH/OUT/00001: Bolt',
      },
      reservationNeeded: true,
      applyDone: false,
    });
  });

  it('makes a move with no demand when the transfer has no move of the product', () => {
    const plan = planMoveLineCreate({
      line: line({ quantity: 2 }),
      move: null,
      picking: READY_PICKING,
      pickingMoves: [],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.newMove).toEqual({
      id: 'new-move',
      productId: 'p',
      productUomQty: 0,
      productUomId: 'unit',
      locationId: 'stock',
      locationDestId: 'customers',
      picked: false,
      pickingId: 'out1',
      state: 'ASSIGNED',
      pickingTypeId: 'type-out',
      restrictPartnerId: null,
      companyId: 'c1',
      personId: null,
    });
    expect(plan.moveId).toBe('new-move');
    expect(plan.lineData.moveId).toBe('new-move');
    expect(plan.applyDone).toBe(false);
  });

  it("gives the move made for a line the transfer's owner", () => {
    const plan = planMoveLineCreate({
      line: line(),
      move: null,
      picking: { ...READY_PICKING, ownerId: 'o' },
      pickingMoves: [],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.newMove).toMatchObject({ id: 'new-move', restrictPartnerId: 'o' });
  });

  it('on a done transfer makes a done move with the line quantity and posts the line at once', () => {
    const plan = planMoveLineCreate({
      line: line({ quantity: 3 }),
      move: null,
      picking: { ...READY_PICKING, state: 'DONE' as const },
      pickingMoves: [move({ state: 'DONE' })],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.newMove).toMatchObject({ id: 'new-move', productUomQty: 3, state: 'DONE' });
    expect(plan.lineData).toMatchObject({ state: 'DONE', quantityProductUom: 3 });
    expect(plan.applyDone).toBe(true);
    expect(plan.reservationNeeded).toBe(false);
  });

  it('takes the move unit and the picked flag of its move when the line has none', () => {
    const plan = planMoveLineCreate({
      line: line({ moveId: 'm1' }),
      move: move({ productUomId: 'dozen', picked: true }),
      picking: READY_PICKING,
      pickingMoves: [],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.lineData).toMatchObject({ productUomId: 'dozen', picked: true, quantityProductUom: 12 });
    expect(plan.newMove).toBeNull();
  });

  it('reserves nothing for a line taken from a vendor location', () => {
    const plan = planMoveLineCreate({
      line: line({ moveId: 'm1' }),
      move: move({ locationId: 'vendors', locationDestId: 'stock' }),
      picking: { ...READY_PICKING, locationId: 'vendors', locationDestId: 'stock' },
      pickingMoves: [],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.reservationNeeded).toBe(false);
  });

  it('reserves nothing for a product that does not track inventory', () => {
    const plan = planMoveLineCreate({
      line: line({ moveId: 'm1' }),
      move: move(),
      picking: READY_PICKING,
      pickingMoves: [],
      product: { ...PRODUCT, isStorable: false },
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect(plan.reservationNeeded).toBe(false);
  });

  it('does not rewrite the state of a line that already holds its done state', () => {
    const plan = planMoveLineCreate({
      line: line({ moveId: 'm1', state: 'DONE' as const, quantity: 3, quantityProductUom: 3 }),
      move: move({ state: 'DONE' }),
      picking: { ...READY_PICKING, state: 'DONE' as const },
      pickingMoves: [],
      product: PRODUCT,
      uoms: UOMS,
      locationUsages: USAGES,
      digits: 2,
      newMoveId: 'new-move',
    });

    expect('state' in plan.lineData).toBe(false);
    expect(plan.reservationNeeded).toBe(false);
  });
});
