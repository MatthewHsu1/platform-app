import { describe, expect, it } from 'vitest';

import { showCheckAvailability, sortMovesForAssign } from 'src/stock/utils/check-availability.util';

const waitingMove = { picked: false, productUomQty: 5, quantity: 0, state: 'CONFIRMED' as const };

describe('showCheckAvailability', () => {
  it('is shown on a waiting transfer with a move still missing stock', () => {
    expect(showCheckAvailability({ state: 'CONFIRMED', moves: [waitingMove], digits: 2 })).toBe(true);
  });

  it('is hidden on a draft, done or cancelled transfer', () => {
    for (const state of ['DRAFT', 'DONE', 'CANCEL'] as const) {
      expect(showCheckAvailability({ state, moves: [waitingMove], digits: 2 })).toBe(false);
    }
  });

  it('is hidden when every move is picked or fully reserved', () => {
    expect(
      showCheckAvailability({
        state: 'ASSIGNED',
        moves: [
          { picked: true, productUomQty: 5, quantity: 0, state: 'CONFIRMED' },
          { picked: false, productUomQty: 3, quantity: 3, state: 'ASSIGNED' },
        ],
        digits: 2,
      }),
    ).toBe(false);
  });

  it('is hidden when the only moves still waiting have no demand', () => {
    expect(
      showCheckAvailability({
        state: 'ASSIGNED',
        moves: [
          { picked: false, productUomQty: 0, quantity: 1, state: 'CONFIRMED' },
          { picked: false, productUomQty: 4, quantity: 2, state: 'ASSIGNED' },
        ],
        digits: 2,
      }),
    ).toBe(false);
  });
});

describe('sortMovesForAssign', () => {
  it('reserves urgent moves first, then moves with the earliest deadline, then the earliest date', () => {
    const base = { priority: 'NORMAL' as const, dateDeadline: null, date: '2026-10-08T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z' };

    const sorted = sortMovesForAssign([
      { ...base, id: 'no-deadline' },
      { ...base, id: 'late-deadline', dateDeadline: '2026-10-20T00:00:00.000Z' },
      { ...base, id: 'early-deadline', dateDeadline: '2026-10-10T00:00:00.000Z' },
      { ...base, id: 'earlier-date', date: '2026-10-07T00:00:00.000Z' },
      { ...base, id: 'urgent', priority: 'URGENT' },
      { ...base, id: 'newer', createdAt: '2026-10-02T00:00:00.000Z' },
    ]);

    expect(sorted.map((move) => move.id)).toEqual([
      'urgent',
      'early-deadline',
      'late-deadline',
      'earlier-date',
      'no-deadline',
      'newer',
    ]);
  });
});
