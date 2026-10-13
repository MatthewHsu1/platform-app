import { describe, expect, it } from 'vitest';

import { planMoveLineTrackingUndo } from 'src/stock/utils/plan-move-line-tracking-undo.util';

const line = {
  id: 'l1',
  pickingId: 't1',
  moveId: 'm1',
  quantity: 1,
  locationId: 'stock',
  lotId: 'sn1',
  picked: false,
  updatedAt: '2026-10-10T08:00:00.000Z',
};

describe('planMoveLineTrackingUndo', () => {
  it('puts back every field the refused save changed, not only the quantity', () => {
    expect(
      planMoveLineTrackingUndo({
        operation: 'updated',
        before: line,
        after: { ...line, quantity: 2, locationId: 'shelf', updatedAt: '2026-10-10T09:00:00.000Z' },
        updatedFields: ['quantity', 'locationId', 'location', 'updatedAt'],
      }),
    ).toEqual({ kind: 'putBack', data: { quantity: 1, locationId: 'stock' } });
  });

  it('finds the changed fields from the values when the event does not list them', () => {
    expect(
      planMoveLineTrackingUndo({
        operation: 'updated',
        before: line,
        after: { ...line, quantity: 2, picked: true },
        updatedFields: [],
      }),
    ).toEqual({ kind: 'putBack', data: { quantity: 1, picked: false } });
  });

  it('writes a relation back through its join column', () => {
    const before = { ...line, lot: { id: 'sn1' } };

    expect(
      planMoveLineTrackingUndo({ operation: 'updated', before, after: { ...before, lotId: 'x', lot: { id: 'x' } }, updatedFields: [] }),
    ).toEqual({ kind: 'putBack', data: { lotId: 'sn1' } });
  });

  it('destroys a refused new line and notes it on its transfer, else on its move', () => {
    expect(planMoveLineTrackingUndo({ operation: 'created', before: undefined, after: line, updatedFields: [] })).toEqual({
      kind: 'destroy',
      noteOn: { objectSingular: 'stockPicking', recordId: 't1' },
    });
    expect(
      planMoveLineTrackingUndo({ operation: 'created', before: undefined, after: { ...line, pickingId: null }, updatedFields: [] }),
    ).toEqual({ kind: 'destroy', noteOn: { objectSingular: 'stockMove', recordId: 'm1' } });
  });

  it('never destroys a line on an edit, even when its earlier values are unknown', () => {
    expect(planMoveLineTrackingUndo({ operation: 'updated', before: undefined, after: line, updatedFields: [] })).toEqual({
      kind: 'none',
    });
  });
});
