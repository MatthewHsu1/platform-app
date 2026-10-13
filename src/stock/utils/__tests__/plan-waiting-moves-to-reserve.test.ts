import { describe, expect, it } from 'vitest';

import { planWaitingMovesToReserve } from 'src/stock/utils/plan-waiting-moves-to-reserve.util';
import { type WaitingMove } from 'src/stock/utils/types/waiting-move.type';

const move = (overrides: Partial<WaitingMove> & { id: string }): WaitingMove => ({
  state: 'CONFIRMED',
  productUomQty: 5,
  reservationDate: '2026-10-01',
  priority: 'NORMAL',
  date: '2026-10-01T10:00:00.000Z',
  pickingTypeReservationMethod: 'BY_DATE',
  ...overrides,
});

describe('planWaitingMovesToReserve', () => {
  it('keeps waiting moves whose day has come or whose type reserves at confirmation, oldest first, in chunks', () => {
    const chunks = planWaitingMovesToReserve({
      today: '2026-10-08',
      chunkSize: 2,
      moves: [
        move({ id: 'm1' }),
        move({ id: 'm2', state: 'PARTIALLY_AVAILABLE', priority: 'URGENT', date: '2026-10-02T10:00:00.000Z' }),
        move({ id: 'm3', reservationDate: '2026-10-20' }),
        move({ id: 'm4', reservationDate: null, pickingTypeReservationMethod: 'AT_CONFIRM' }),
        move({ id: 'm5', state: 'ASSIGNED' }),
        move({ id: 'm6', state: 'WAITING' }),
        move({ id: 'm7', productUomQty: 0 }),
        move({ id: 'm8', date: '2026-10-01T09:00:00.000Z' }),
        move({ id: 'm9', reservationDate: null, pickingTypeReservationMethod: 'MANUAL' }),
      ],
    });

    expect(chunks).toEqual([
      ['m2', 'm8'],
      ['m1', 'm4'],
    ]);
  });

  it('breaks a full tie on the id', () => {
    expect(
      planWaitingMovesToReserve({ today: '2026-10-08', chunkSize: 10, moves: [move({ id: 'b' }), move({ id: 'a' })] }),
    ).toEqual([['a', 'b']]);
  });

  it('returns no chunk when nothing waits', () => {
    expect(planWaitingMovesToReserve({ today: '2026-10-08', chunkSize: 10, moves: [] })).toEqual([]);
  });
});
