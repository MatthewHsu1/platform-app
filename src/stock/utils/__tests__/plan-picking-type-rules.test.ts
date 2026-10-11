import { describe, expect, it } from 'vitest';

import {
  planPickingTypeDefaults,
  planReservationDates,
  planTypeSequenceRename,
} from 'src/stock/utils/plan-picking-type-rules.util';

const MAIN = { id: 'wh', name: 'Main', code: 'WH', lotStockId: 'stock' };
const NEW_TYPE = {
  code: 'INCOMING' as const,
  sequenceCode: 'RSV',
  referenceSequenceId: null,
  warehouseId: null,
  defaultLocationSrcId: null,
  defaultLocationDestId: null,
  useCreateLots: false,
  useExistingLots: true,
  printLabel: true,
};

describe('planPickingTypeDefaults', () => {
  it('fills the first warehouse, its sequence, the default locations and the flags of a receipt type', () => {
    expect(
      planPickingTypeDefaults({ mode: 'created', type: NEW_TYPE, warehouse: MAIN, vendorsId: 'vendors', customersId: 'customers' }),
    ).toEqual({
      kind: 'update',
      data: {
        warehouseId: 'wh',
        defaultLocationSrcId: 'vendors',
        defaultLocationDestId: 'stock',
        useCreateLots: true,
        printLabel: false,
      },
      sequence: { name: 'Main Sequence RSV', prefix: 'WH/RSV/', padding: 5 },
    });
  });

  it('keeps default locations typed at creation (custom delivery type DSC)', () => {
    expect(
      planPickingTypeDefaults({
        mode: 'created',
        type: {
          ...NEW_TYPE,
          code: 'OUTGOING',
          sequenceCode: 'DSC',
          warehouseId: 'wh',
          defaultLocationSrcId: 'stock',
          defaultLocationDestId: 'customer-stock',
          useCreateLots: true,
          printLabel: false,
        },
        warehouse: MAIN,
        vendorsId: 'vendors',
        customersId: 'customers',
      }),
    ).toEqual({
      kind: 'update',
      data: { printLabel: true },
      sequence: { name: 'Main Sequence DSC', prefix: 'WH/DSC/', padding: 5 },
    });
  });

  it('makes no sequence when one is linked or no prefix is given', () => {
    const plan = planPickingTypeDefaults({
      mode: 'created',
      type: { ...NEW_TYPE, referenceSequenceId: 'seq' },
      warehouse: MAIN,
      vendorsId: 'vendors',
      customersId: 'customers',
    });
    expect(plan.kind === 'update' && plan.sequence).toBeNull();
  });

  it('refuses when no warehouse exists at all', () => {
    expect(
      planPickingTypeDefaults({ mode: 'created', type: NEW_TYPE, warehouse: null, vendorsId: 'vendors', customersId: 'customers' }),
    ).toEqual({ kind: 'refuse' });
  });
});

describe('planPickingTypeDefaults when the code changes', () => {
  it('recomputes both defaults and the flags of a type turned into a delivery', () => {
    expect(
      planPickingTypeDefaults({
        mode: 'codeChanged',
        type: {
          ...NEW_TYPE,
          code: 'OUTGOING',
          warehouseId: 'wh',
          referenceSequenceId: 'seq',
          defaultLocationSrcId: 'vendors',
          defaultLocationDestId: 'stock',
          useCreateLots: true,
          useExistingLots: false,
          printLabel: false,
        },
        warehouse: MAIN,
        vendorsId: 'vendors',
        customersId: 'customers',
      }),
    ).toEqual({
      kind: 'update',
      data: { defaultLocationSrcId: 'stock', defaultLocationDestId: 'customers', useExistingLots: true, printLabel: true },
      sequence: null,
    });
  });
});

describe('planPickingTypeDefaults for a type without a warehouse', () => {
  it('recomputes the defaults from the first warehouse it is given', () => {
    expect(
      planPickingTypeDefaults({
        mode: 'codeChanged',
        type: { ...NEW_TYPE, code: 'OUTGOING', referenceSequenceId: 'seq', useExistingLots: false, printLabel: false },
        warehouse: MAIN,
        vendorsId: 'vendors',
        customersId: 'customers',
      }),
    ).toEqual({
      kind: 'update',
      data: { defaultLocationSrcId: 'stock', defaultLocationDestId: 'customers', useExistingLots: true, printLabel: true },
      sequence: null,
    });
  });
});

describe('planTypeSequenceRename', () => {
  it('renames and re-prefixes the sequence of a warehouse type', () => {
    expect(
      planTypeSequenceRename({
        sequenceCode: 'REC',
        warehouse: { name: 'Main', code: 'WH' },
        sequence: { name: 'Main Sequence in', prefix: 'WH/IN/', padding: 5 },
      }),
    ).toEqual({ name: 'Main Sequence REC', prefix: 'WH/REC/' });
  });

  it('uses the bare code without a warehouse, and writes nothing without a sequence', () => {
    expect(
      planTypeSequenceRename({ sequenceCode: 'X', warehouse: null, sequence: { name: 'Sequence Y', prefix: 'Y', padding: 3 } }),
    ).toEqual({ name: 'Sequence X', prefix: 'X' });
    expect(planTypeSequenceRename({ sequenceCode: 'X', warehouse: null, sequence: null })).toBeNull();
  });
});

describe('planReservationDates', () => {
  const moves = [
    { id: 'm1', state: 'CONFIRMED' as const, date: '2026-10-10T08:00:00.000Z', priority: 'NORMAL' as const, reservationDate: null },
    { id: 'm2', state: 'WAITING' as const, date: '2026-10-10T08:00:00.000Z', priority: 'URGENT' as const, reservationDate: null },
    { id: 'm3', state: 'ASSIGNED' as const, date: '2026-10-10T08:00:00.000Z', priority: 'NORMAL' as const, reservationDate: '2026-10-01' },
    { id: 'm4', state: 'DONE' as const, date: '2026-10-10T08:00:00.000Z', priority: 'NORMAL' as const, reservationDate: '2026-10-01' },
  ];

  it('dates open moves days before their scheduled day when the type turns to "before scheduled date"', () => {
    expect(
      planReservationDates({ before: 'AT_CONFIRM', after: 'BY_DATE', daysBefore: 2, daysBeforePriority: 1, moves }),
    ).toEqual([
      { id: 'm1', reservationDate: '2026-10-08' },
      { id: 'm2', reservationDate: '2026-10-09' },
    ]);
  });

  it('clears the date of moves not reserved, done or cancelled when the type leaves it', () => {
    expect(
      planReservationDates({
        before: 'BY_DATE',
        after: 'MANUAL',
        daysBefore: 2,
        daysBeforePriority: 1,
        moves: moves.map((move) => ({ ...move, reservationDate: '2026-10-08' })),
      }),
    ).toEqual([
      { id: 'm1', reservationDate: null },
      { id: 'm2', reservationDate: null },
    ]);
  });

  it('does nothing when the method stays the same', () => {
    expect(planReservationDates({ before: 'BY_DATE', after: 'BY_DATE', daysBefore: 2, daysBeforePriority: 1, moves })).toEqual([]);
  });
});
