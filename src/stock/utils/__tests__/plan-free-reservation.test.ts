import { describe, expect, it } from 'vitest';

import { planFreeReservation } from 'src/stock/utils/plan-free-reservation.util';
import { type FreeReservationCandidate } from 'src/stock/utils/types/free-reservation-candidate.type';

const candidate = (overrides: Partial<FreeReservationCandidate>): FreeReservationCandidate => ({
  lineId: 'l',
  moveId: 'm',
  pickingId: null,
  scheduledDate: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  quantityProductUom: 2,
  ...overrides,
});

describe('planFreeReservation', () => {
  it('frees the whole 15 another move reserved when 30 are validated out of 30', () => {
    expect(
      planFreeReservation({
        shortfall: 15,
        pickingId: null,
        digits: 2,
        candidates: [candidate({ lineId: 'line1', moveId: 'move1', quantityProductUom: 15 })],
      }),
    ).toEqual({ destroy: ['line1'], shrink: [], movesToReassign: ['move1'] });
  });

  it('takes the same transfer first, then the latest scheduled date, and shrinks the last line', () => {
    const plan = planFreeReservation({
      shortfall: 3,
      pickingId: 'p',
      digits: 2,
      candidates: [
        candidate({ lineId: 'a', moveId: 'ma', pickingId: 'other1', scheduledDate: '2026-10-01T00:00:00.000Z', createdAt: '2026-10-08T10:01:00.000Z' }),
        candidate({ lineId: 'b', moveId: 'mb', pickingId: 'p', scheduledDate: '2026-09-01T00:00:00.000Z', createdAt: '2026-10-08T10:00:00.000Z' }),
        candidate({ lineId: 'c', moveId: 'mc', pickingId: 'other2', scheduledDate: '2026-10-05T00:00:00.000Z', createdAt: '2026-10-08T10:02:00.000Z' }),
      ],
    });

    expect(plan).toEqual({ destroy: ['b'], shrink: [{ lineId: 'c', quantityProductUom: 1 }], movesToReassign: ['mc', 'mb'] });
  });

  it('takes the newest line first when two transfers share the scheduled date', () => {
    const plan = planFreeReservation({
      shortfall: 2,
      pickingId: 'p',
      digits: 2,
      candidates: [
        candidate({ lineId: 'old', moveId: 'mo', pickingId: 'x', createdAt: '2026-10-08T09:00:00.000Z' }),
        candidate({ lineId: 'new', moveId: 'mn', pickingId: 'y', createdAt: '2026-10-08T11:00:00.000Z' }),
      ],
    });

    expect(plan.destroy).toEqual(['new']);
  });

  it('frees nothing without candidates', () => {
    expect(planFreeReservation({ shortfall: 2, pickingId: 'p', digits: 2, candidates: [] })).toEqual({
      destroy: [],
      shrink: [],
      movesToReassign: [],
    });
  });
});
