import { describe, expect, it } from 'vitest';

import { planRetryWaitingMoves } from 'src/stock/utils/plan-retry-waiting-moves.util';
import { type RetryCandidate } from 'src/stock/utils/types/retry-candidate.type';

const candidate = (overrides: Partial<RetryCandidate>): RetryCandidate => ({
  id: 'c',
  productId: 'P',
  state: 'CONFIRMED',
  procureMethod: 'MAKE_TO_STOCK',
  locationParentPath: 'wh/stock/',
  reservationDate: null,
  reservesAtConfirm: true,
  priority: 'NORMAL',
  date: '2026-10-01T00:00:00.000Z',
  referenceIds: [],
  ...overrides,
});

describe('planRetryWaitingMoves', () => {
  it('picks the waiting moves a receipt into Stock can now serve, in order', () => {
    expect(
      planRetryWaitingMoves({
        today: '2026-10-08',
        doneMoves: [{ productId: 'P', locationDestId: 'stock', locationDestParentPath: 'wh/stock/', referenceIds: ['ref1'] }],
        candidates: [
          candidate({ id: 'c1' }),
          candidate({ id: 'c2', locationParentPath: 'wh/stock/shelf/' }),
          candidate({ id: 'c3', procureMethod: 'MAKE_TO_ORDER' }),
          candidate({ id: 'c4', productId: 'Q' }),
          candidate({ id: 'c5', reservesAtConfirm: false, reservationDate: '2026-10-09' }),
          candidate({ id: 'c6', reservesAtConfirm: false, reservationDate: null }),
          candidate({ id: 'c7', state: 'PARTIALLY_AVAILABLE', locationParentPath: 'wh/', priority: 'URGENT', date: '2026-10-03T00:00:00.000Z' }),
          candidate({ id: 'c8', date: '2026-10-02T00:00:00.000Z', referenceIds: ['ref1'] }),
          candidate({ id: 'c9', state: 'ASSIGNED' }),
          candidate({ id: 'c10', reservesAtConfirm: false, reservationDate: '2026-10-08', date: '2026-10-05T00:00:00.000Z' }),
        ],
      }),
    ).toEqual(['c8', 'c7', 'c1', 'c10']);
  });
});
