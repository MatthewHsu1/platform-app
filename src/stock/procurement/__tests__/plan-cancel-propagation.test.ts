import { describe, expect, it } from 'vitest';

import { planCancelPropagation } from 'src/stock/procurement/plan-cancel-propagation';
import { type CancelPropagationMove } from 'src/stock/procurement/types/cancel-propagation-move.type';

type GraphRow = Partial<CancelPropagationMove> & Pick<CancelPropagationMove, 'id' | 'locationId' | 'locationDestId'>;

// Fills each move's origin links from the destination links the rows name.
const graph = (rows: GraphRow[]): CancelPropagationMove[] => {
  const moves = rows.map(
    (row): CancelPropagationMove => ({ state: 'WAITING', propagateCancel: true, moveDestIds: [], ...row, moveOrigIds: [] }),
  );
  for (const move of moves) {
    for (const destinationId of move.moveDestIds) {
      moves.find((other) => other.id === destinationId)?.moveOrigIds.push(move.id);
    }
  }
  return moves;
};

describe('planCancelPropagation', () => {
  it('cancels the pack and ship moves when the pick of a three-step chain is cancelled', () => {
    const moves = graph([
      { id: 'pick', locationId: 'stock', locationDestId: 'pack', moveDestIds: ['pack'], state: 'CONFIRMED' },
      { id: 'pack', locationId: 'pack', locationDestId: 'output', moveDestIds: ['ship'] },
      { id: 'ship', locationId: 'output', locationDestId: 'customers', propagateCancel: false },
    ]);

    expect(planCancelPropagation({ cancelled: ['pick'], moves })).toEqual({
      cancel: ['pick', 'pack', 'ship'],
      makeToStock: ['ship', 'pack', 'pick'],
      unlink: [
        { moveOrigId: 'pack', moveDestId: 'ship' },
        { moveOrigId: 'pick', moveDestId: 'pack' },
      ],
    });
  });

  it('lets the next move take from stock when the cancelled move does not cancel forward', () => {
    const moves = graph([
      { id: 'pick', locationId: 'stock', locationDestId: 'pack', moveDestIds: ['ship'], propagateCancel: false, state: 'ASSIGNED' },
      { id: 'ship', locationId: 'pack', locationDestId: 'customers' },
    ]);

    expect(planCancelPropagation({ cancelled: ['pick'], moves })).toEqual({
      cancel: ['pick'],
      makeToStock: ['ship', 'pick'],
      unlink: [{ moveOrigId: 'pick', moveDestId: 'ship' }],
    });
  });

  it('keeps the next move while another move still feeds it', () => {
    const moves = graph([
      { id: 'a', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'] },
      { id: 'b', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'], state: 'CONFIRMED' },
      { id: 'ship', locationId: 'output', locationDestId: 'customers' },
    ]);

    expect(planCancelPropagation({ cancelled: ['a'], moves })).toEqual({ cancel: ['a'], makeToStock: ['a'], unlink: [] });
  });

  it('cancels only the next moves that start where the cancelled move ends; the others take from stock', () => {
    const moves = graph([
      { id: 'pick', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship', 'elsewhere'] },
      { id: 'ship', locationId: 'output', locationDestId: 'customers' },
      { id: 'elsewhere', locationId: 'pack', locationDestId: 'customers' },
    ]);

    expect(planCancelPropagation({ cancelled: ['pick'], moves })).toEqual({
      cancel: ['pick', 'ship'],
      makeToStock: ['ship', 'elsewhere', 'pick'],
      unlink: [
        { moveOrigId: 'pick', moveDestId: 'ship' },
        { moveOrigId: 'pick', moveDestId: 'elsewhere' },
      ],
    });
  });

  it('never cancels a done next move; it stops waiting for the cancelled move instead', () => {
    const moves = graph([
      { id: 'pick', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'] },
      { id: 'ship', locationId: 'output', locationDestId: 'customers', state: 'DONE' },
    ]);

    expect(planCancelPropagation({ cancelled: ['pick'], moves })).toEqual({
      cancel: ['pick'],
      makeToStock: ['ship', 'pick'],
      unlink: [{ moveOrigId: 'pick', moveDestId: 'ship' }],
    });
  });

  it('leaves the next move linked when a move that does not cancel forward is cancelled while another feeding move is still open', () => {
    const moves = graph([
      { id: 'a', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'], propagateCancel: false },
      { id: 'b', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'], state: 'CONFIRMED' },
      { id: 'ship', locationId: 'output', locationDestId: 'customers' },
    ]);

    expect(planCancelPropagation({ cancelled: ['a'], moves })).toEqual({ cancel: ['a'], makeToStock: ['a'], unlink: [] });
  });

  it('cancels the next move once when both moves feeding it are cancelled together', () => {
    const moves = graph([
      { id: 'a', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'] },
      { id: 'b', locationId: 'stock', locationDestId: 'output', moveDestIds: ['ship'] },
      { id: 'ship', locationId: 'output', locationDestId: 'customers' },
    ]);

    expect(planCancelPropagation({ cancelled: ['a', 'b'], moves })).toEqual({
      cancel: ['a', 'b', 'ship'],
      makeToStock: ['ship', 'a', 'b'],
      unlink: [
        { moveOrigId: 'a', moveDestId: 'ship' },
        { moveOrigId: 'b', moveDestId: 'ship' },
      ],
    });
  });

  it('removes the feeding links of the cancelled moves', () => {
    const moves = graph([
      { id: 'receipt', locationId: 'vendors', locationDestId: 'stock', moveDestIds: ['pick'], state: 'DONE' },
      { id: 'pick', locationId: 'stock', locationDestId: 'output' },
    ]);

    expect(planCancelPropagation({ cancelled: ['pick'], moves }).unlink).toEqual([{ moveOrigId: 'receipt', moveDestId: 'pick' }]);
  });
});
