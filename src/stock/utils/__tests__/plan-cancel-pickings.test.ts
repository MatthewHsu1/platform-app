import { describe, expect, it } from 'vitest';

import { planCancelPickings } from 'src/stock/utils/plan-cancel-pickings.util';

describe('planCancelPickings', () => {
  it('locks every transfer, writes Cancelled only on a transfer with no moves, recomputes the others', () => {
    expect(
      planCancelPickings({
        pickings: [
          { id: 'confirmed', isLocked: false, state: 'CONFIRMED', moveCount: 1 },
          { id: 'empty', isLocked: false, state: 'DRAFT', moveCount: 0 },
        ],
      }),
    ).toEqual({ lockIds: ['confirmed', 'empty'], cancelEmptyIds: ['empty'], recomputeIds: ['confirmed'] });
  });

  it('writes nothing that is already so', () => {
    expect(
      planCancelPickings({ pickings: [{ id: 'done-before', isLocked: true, state: 'CANCEL', moveCount: 0 }] }),
    ).toEqual({ lockIds: [], cancelEmptyIds: [], recomputeIds: [] });
  });
});
