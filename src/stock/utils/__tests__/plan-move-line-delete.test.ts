import { describe, expect, it } from 'vitest';

import { DELETE_DONE_LINE_REASON, planMoveLineDelete } from 'src/stock/utils/plan-move-line-delete.util';

describe('planMoveLineDelete', () => {
  it('restores a done or cancelled line', () => {
    expect(planMoveLineDelete({ state: 'DONE' })).toEqual({ kind: 'restore', reason: DELETE_DONE_LINE_REASON });
    expect(planMoveLineDelete({ state: 'CANCEL' })).toEqual({ kind: 'restore', reason: DELETE_DONE_LINE_REASON });
  });

  it('lets an open line go, which frees its reservation', () => {
    expect(planMoveLineDelete({ state: 'ASSIGNED' })).toEqual({ kind: 'free' });
    expect(planMoveLineDelete({ state: 'DRAFT' })).toEqual({ kind: 'free' });
  });
});
