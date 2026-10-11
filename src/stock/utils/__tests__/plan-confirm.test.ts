import { describe, expect, it } from 'vitest';

import { MTS_ELSE_MTO, pickingAssignmentKey, planConfirm } from 'src/stock/utils/plan-confirm.util';
import { type ConfirmMove } from 'src/stock/utils/types/confirm-move.type';

const draft = (id: string, overrides: Partial<ConfirmMove> = {}): ConfirmMove => ({
  id,
  state: 'DRAFT',
  procureMethod: 'MAKE_TO_STOCK',
  moveOrigIds: [],
  ruleProcureMethod: null,
  pickingId: null,
  pickingTypeId: null,
  reservationMethod: null,
  referenceIds: [],
  locationId: 'vendors',
  locationDestId: 'stock',
  moveOrigPickingIds: [],
  ...overrides,
});

describe('planConfirm', () => {
  it('confirms a plain move and gives it no transfer when it has no operation type', () => {
    expect(planConfirm([draft('m1')], { createProcurement: true })).toEqual({
      confirmed: ['m1'],
      waiting: [],
      procure: [],
      reserveToday: [],
      assignGroups: [],
    });
  });

  it('puts a move with original moves in waiting, and a make-to-order move in waiting with a procurement', () => {
    const plan = planConfirm(
      [draft('chained', { moveOrigIds: ['up'] }), draft('mto', { procureMethod: 'MAKE_TO_ORDER' })],
      { createProcurement: true },
    );

    expect(plan.waiting).toEqual(['chained', 'mto']);
    expect(plan.procure).toEqual(['mto']);
    expect(plan.confirmed).toEqual([]);
  });

  it('confirms a move whose rule takes stock else orders, and procures for it', () => {
    const plan = planConfirm([draft('m1', { ruleProcureMethod: MTS_ELSE_MTO })], { createProcurement: true });

    expect(plan.confirmed).toEqual(['m1']);
    expect(plan.procure).toEqual(['m1']);
  });

  it('asks for no procurement when the caller says so (backorder moves)', () => {
    expect(
      planConfirm([draft('mto', { procureMethod: 'MAKE_TO_ORDER' })], { createProcurement: false }).procure,
    ).toEqual([]);
  });

  it('skips moves that are not draft', () => {
    expect(planConfirm([draft('m1', { state: 'CONFIRMED' })], { createProcurement: true }).confirmed).toEqual([]);
  });

  it('dates the reservation today only for types that reserve at confirmation', () => {
    const plan = planConfirm(
      [
        draft('atConfirm', { reservationMethod: 'AT_CONFIRM' }),
        draft('manual', { reservationMethod: 'MANUAL' }),
        draft('byDate', { reservationMethod: 'BY_DATE' }),
      ],
      { createProcurement: true },
    );

    expect(plan.reserveToday).toEqual(['atConfirm']);
  });

  it('groups moves with a type and no transfer by references, locations and type', () => {
    const plan = planConfirm(
      [
        draft('a', { pickingTypeId: 'out', referenceIds: ['SO1'], locationId: 'stock', locationDestId: 'customers' }),
        draft('b', { pickingTypeId: 'out', referenceIds: ['SO1'], locationId: 'stock', locationDestId: 'customers' }),
        draft('c', { pickingTypeId: 'out', referenceIds: ['SO2'], locationId: 'stock', locationDestId: 'customers' }),
        draft('d', { pickingTypeId: 'out', pickingId: 'already', referenceIds: ['SO1'] }),
      ],
      { createProcurement: true },
    );

    expect(plan.assignGroups).toEqual([
      { key: 'SO1|stock|customers|out', moveIds: ['a', 'b'] },
      { key: 'SO2|stock|customers|out', moveIds: ['c'] },
    ]);
  });
});

describe('pickingAssignmentKey', () => {
  it("adds the original moves' transfers only when the move has no reference", () => {
    const base = { locationId: 'output', locationDestId: 'customers', pickingTypeId: 'out', moveOrigPickingIds: ['pick2', 'pick1'] };

    expect(pickingAssignmentKey({ ...base, referenceIds: [] })).toBe('|output|customers|out|pick1,pick2');
    expect(pickingAssignmentKey({ ...base, referenceIds: ['SO1'] })).toBe('SO1|output|customers|out');
  });
});
