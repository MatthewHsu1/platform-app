import { describe, expect, it } from 'vitest';

import { type AutoOrderpoint } from 'src/stock/orderpoint/types/auto-orderpoint.type';
import { type ConfirmedMove } from 'src/stock/orderpoint/types/confirmed-move.type';
import { selectOrderpointsForMoves } from 'src/stock/orderpoint/utils/select-orderpoints-for-moves.util';

// WH (view) > Stock > Shelf; Vendors and Customers outside.
const locationPaths = new Map([
  ['wh', 'wh/'],
  ['stock', 'wh/stock/'],
  ['shelf', 'wh/stock/shelf/'],
  ['vendors', 'vendors/'],
  ['customers', 'customers/'],
]);
const move = (values: Partial<ConfirmedMove>): ConfirmedMove => ({
  id: 'm1',
  productId: 'A',
  state: 'CONFIRMED',
  locationId: 'stock',
  locationDestId: 'customers',
  productQty: 12,
  referenceIds: [],
  ...values,
});
const rule = (values: Partial<AutoOrderpoint>): AutoOrderpoint => ({
  id: 'op-stock',
  productId: 'A',
  trigger: 'AUTO',
  active: true,
  locationId: 'stock',
  locationCompleteName: 'WH/Stock',
  createdAt: '2026-01-01T00:00:00.000Z',
  productMinQty: 0,
  ...values,
});
const select = (moves: ConfirmedMove[], orderpoints: AutoOrderpoint[]) =>
  selectOrderpointsForMoves({ moves, orderpoints, locationPaths }).orderpointIds;

describe('selectOrderpointsForMoves', () => {
  it('a delivery from stock sets off the automatic rule of stock', () => {
    expect(select([move({})], [rule({})])).toEqual(['op-stock']);
  });

  it('a rule above the source counts; a rule whose location also holds the destination does not', () => {
    expect(select([move({ locationId: 'shelf' })], [rule({})])).toEqual(['op-stock']);
    expect(select([move({ locationDestId: 'shelf' })], [rule({})])).toEqual([]);
    expect(select([move({ locationId: 'vendors', locationDestId: 'stock' })], [rule({})])).toEqual([]);
  });

  it('does not take a location whose path only starts with the same letters', () => {
    const paths = new Map([...locationPaths, ['stock2', 'wh/stock2/']]);

    expect(
      selectOrderpointsForMoves({ moves: [move({ locationId: 'stock2' })], orderpoints: [rule({})], locationPaths: paths }).orderpointIds,
    ).toEqual([]);
  });

  it('ignores manual and archived rules, other products and moves that are not running', () => {
    expect(select([move({})], [rule({ trigger: 'MANUAL' })])).toEqual([]);
    expect(select([move({})], [rule({ active: false })])).toEqual([]);
    expect(select([move({ productId: 'B' })], [rule({})])).toEqual([]);
    expect(select([move({ state: 'DONE' })], [rule({})])).toEqual([]);
    expect(select([move({ state: 'DRAFT' })], [rule({})])).toEqual([]);
    expect(select([move({ state: 'CANCEL' })], [rule({})])).toEqual([]);
  });

  it('takes one rule per move: the first by location full name, then the oldest', () => {
    expect(select([move({})], [rule({ id: 'op-wh', locationId: 'wh', locationCompleteName: 'WH' }), rule({})])).toEqual(['op-wh']);
    expect(
      select([move({})], [rule({ id: 'op-newer', createdAt: '2026-02-01T00:00:00.000Z' }), rule({ id: 'op-older' })]),
    ).toEqual(['op-older']);
  });

  it('keeps the references of a move bigger than the minimum as the origin', () => {
    const result = selectOrderpointsForMoves({
      moves: [move({ referenceIds: ['r1'] }), move({ id: 'm2', productQty: 0, referenceIds: ['r2'] })],
      orderpoints: [rule({})],
      locationPaths,
    });

    expect(result.orderpointIds).toEqual(['op-stock']);
    expect(result.origins.get('op-stock')).toEqual(['r1']);
  });

  it('gathers the references of every move that sets off the same rule, once each', () => {
    const result = selectOrderpointsForMoves({
      moves: [move({ referenceIds: ['r1', 'r2'] }), move({ id: 'm2', referenceIds: ['r2', 'r3'] })],
      orderpoints: [rule({})],
      locationPaths,
    });

    expect(result.origins.get('op-stock')).toEqual(['r1', 'r2', 'r3']);
  });
});
