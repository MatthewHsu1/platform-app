import { describe, expect, it } from 'vitest';

import { pickingsToAutoBatchForMoves } from 'src/stock-picking-batch/utils/auto-batch-moves.util';

const move = (pickingId: string | null, state: string, updatedAt = '2025-09-02T10:00:00.000Z') => ({ pickingId, state, updatedAt });

describe('pickingsToAutoBatchForMoves', () => {
  it('looks for a batch for the transfer of a move that gets reserved, so a ready transfer taken out of its batch is batched again', () => {
    expect(pickingsToAutoBatchForMoves('updated', [{ before: move('p1', 'CONFIRMED'), after: move('p1', 'ASSIGNED') }])).toEqual([
      { pickingId: 'p1', saveKey: '2025-09-02T10:00:00.000Z' },
    ]);
    expect(
      pickingsToAutoBatchForMoves('updated', [{ before: move('p1', 'CONFIRMED'), after: move('p1', 'PARTIALLY_AVAILABLE') }]),
    ).toEqual([{ pickingId: 'p1', saveKey: '2025-09-02T10:00:00.000Z' }]);
  });

  it('looks for a batch for the transfer a move is added to', () => {
    expect(pickingsToAutoBatchForMoves('created', [{ after: move('p1', 'DRAFT') }])).toEqual([
      { pickingId: 'p1', saveKey: '2025-09-02T10:00:00.000Z' },
    ]);
    expect(pickingsToAutoBatchForMoves('updated', [{ before: move(null, 'CONFIRMED'), after: move('p2', 'CONFIRMED') }])).toEqual([
      { pickingId: 'p2', saveKey: '2025-09-02T10:00:00.000Z' },
    ]);
  });

  it('does nothing for a move with no transfer, a reservation that did not change, or a state that is not reserved', () => {
    expect(pickingsToAutoBatchForMoves('created', [{ after: move(null, 'DRAFT') }])).toEqual([]);
    expect(pickingsToAutoBatchForMoves('updated', [{ before: move('p1', 'ASSIGNED'), after: move('p1', 'ASSIGNED') }])).toEqual([]);
    expect(pickingsToAutoBatchForMoves('updated', [{ before: move('p1', 'ASSIGNED'), after: move('p1', 'DONE') }])).toEqual([]);
    expect(pickingsToAutoBatchForMoves('deleted', [{ before: move('p1', 'ASSIGNED'), after: move('p1', 'ASSIGNED') }])).toEqual([]);
  });

  it('asks once per transfer, keyed by its latest move save', () => {
    expect(
      pickingsToAutoBatchForMoves('updated', [
        { before: move('p1', 'CONFIRMED'), after: move('p1', 'ASSIGNED', '2025-09-02T10:00:01.000Z') },
        { before: move('p1', 'CONFIRMED'), after: move('p1', 'ASSIGNED', '2025-09-02T10:00:03.000Z') },
        { before: move('p1', 'CONFIRMED'), after: move('p1', 'ASSIGNED', '2025-09-02T10:00:02.000Z') },
      ]),
    ).toEqual([{ pickingId: 'p1', saveKey: '2025-09-02T10:00:03.000Z' }]);
  });
});
