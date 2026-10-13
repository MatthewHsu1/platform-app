import { describe, expect, it } from 'vitest';

import {
  NEGATIVE_RESERVATION_REASON,
  planOpenLineEdit,
  PRODUCT_CHANGE_REASON,
} from 'src/stock/utils/plan-open-line-edit.util';
import { type MoveState } from 'src/stock/types/move-state.type';

const NOW = '2026-10-08T10:00:00.000Z';
const base = {
  productId: 'p', locationId: 'shelf1', locationDestId: 'customers', ownerId: null, productUomId: 'unit',
  quantity: 1, quantityProductUom: 1, picked: false, state: 'ASSIGNED' as MoveState, moveId: 'm1',
};
const plan = (before: Partial<typeof base>, after: Partial<typeof base>, extra: Record<string, unknown> = {}) =>
  planOpenLineEdit({
    before: { ...base, ...before },
    after: { ...base, ...after },
    storedQuantityProductUom: 1,
    isStorable: true,
    digits: 2,
    now: NOW,
    ...extra,
  });

describe('planOpenLineEdit', () => {
  it('recomputes the old and the new key when the source changes, and leaves the move alone', () => {
    expect(plan({}, { locationId: 'shelf2' })).toEqual({
      kind: 'sync',
      data: {},
      recomputeKeys: ['p|shelf1|||', 'p|shelf2|||'],
      recomputeMoveIds: [],
    });
  });

  it('recomputes the key and the move when the quantity changes, and stores the product-unit quantity', () => {
    expect(plan({}, { quantity: 2, quantityProductUom: 2 })).toEqual({
      kind: 'sync',
      data: { quantityProductUom: 2 },
      recomputeKeys: ['p|shelf1|||'],
      recomputeMoveIds: ['m1'],
    });
  });

  it('stamps the date when a line is set to picked, and recomputes its move, which is picked when any line is', () => {
    expect(plan({}, { picked: true })).toEqual({
      kind: 'sync',
      data: { date: NOW },
      recomputeKeys: [],
      recomputeMoveIds: ['m1'],
    });
  });

  it('recomputes the move when a line is set back to not picked', () => {
    expect(plan({ picked: true }, { picked: false })).toEqual({
      kind: 'sync',
      data: {},
      recomputeKeys: [],
      recomputeMoveIds: ['m1'],
    });
  });

  it('stamps the date when a picked line gets more quantity, not when it gets less', () => {
    expect(plan({ picked: true }, { picked: true, quantity: 3, quantityProductUom: 3 })).toMatchObject({
      data: { quantityProductUom: 3, date: NOW },
    });
    expect(
      plan({ picked: true, quantity: 3, quantityProductUom: 3 }, { picked: true, quantity: 1, quantityProductUom: 1 }, { storedQuantityProductUom: 3 }),
    ).toEqual({ kind: 'sync', data: { quantityProductUom: 1 }, recomputeKeys: ['p|shelf1|||'], recomputeMoveIds: ['m1'] });
  });

  it('puts the product back when it changes outside draft', () => {
    expect(plan({}, { productId: 'other' })).toEqual({
      kind: 'putBack',
      data: { productId: 'p' },
      reason: PRODUCT_CHANGE_REASON,
    });
  });

  it('allows a product change on a draft line', () => {
    expect(plan({ state: 'DRAFT' }, { state: 'DRAFT', productId: 'other' })).toMatchObject({ kind: 'sync' });
  });

  it('puts a negative reservation back', () => {
    expect(plan({}, { quantity: -1, quantityProductUom: -1 })).toEqual({
      kind: 'putBack',
      data: { quantity: 1, productUomId: 'unit' },
      reason: NEGATIVE_RESERVATION_REASON,
    });
  });

  it('leaves done lines to the ledger correction', () => {
    expect(plan({ state: 'DONE' }, { state: 'DONE', quantity: 2, quantityProductUom: 2 })).toEqual({ kind: 'none' });
  });

  it('reserves nothing for a product that does not track inventory', () => {
    expect(plan({}, { quantity: 2, quantityProductUom: 2 }, { isStorable: false })).toEqual({
      kind: 'sync',
      data: { quantityProductUom: 2 },
      recomputeKeys: [],
      recomputeMoveIds: ['m1'],
    });
  });

  it('leaves the reservation alone when only the destination changes', () => {
    expect(plan({}, { locationDestId: 'other' })).toEqual({ kind: 'none' });
  });

  it('writes nothing when nothing it watches changed', () => {
    expect(plan({}, {})).toEqual({ kind: 'none' });
  });
});
