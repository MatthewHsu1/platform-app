import { type CancelPropagationMove } from 'src/stock/procurement/types/cancel-propagation-move.type';
import { type CancelPropagationPlan } from 'src/stock/procurement/types/cancel-propagation-plan.type';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';

// What cancelling moves does down their chains. A move that cancels forward
// takes its next moves with it once every other move feeding them is
// cancelled too; the rest of its next moves, and the next moves of a move that
// does not cancel forward once every feeding move is finished, stop waiting
// for it and take from stock. Cancelled moves lose their own feeding links.
export const planCancelPropagation = ({
  cancelled,
  moves: rows,
}: {
  cancelled: string[];
  moves: CancelPropagationMove[];
}): CancelPropagationPlan => {
  const moves = new Map(rows.map((move) => [move.id, move]));
  const state = new Map<string, MoveState>(rows.map((move) => [move.id, move.state]));
  const origins = new Map(rows.map((move) => [move.id, new Set(move.moveOrigIds)]));
  const plan: CancelPropagationPlan = { cancel: [], makeToStock: [], unlink: [] };
  const makeToStock = new Set<string>();

  const unlink = (moveOrigId: string, moveDestId: string) => {
    if (origins.get(moveDestId)?.delete(moveOrigId) === true) {
      plan.unlink.push({ moveOrigId, moveDestId });
    }
  };
  const destinationsOf = (moveId: string) =>
    [...origins.entries()].filter(([, feeding]) => feeding.has(moveId)).map(([destinationId]) => destinationId);

  const cancel = (batch: string[]) => {
    for (const id of batch) {
      state.set(id, MOVE_STATE.CANCEL);
      plan.cancel.push(id);
    }
    for (const id of batch) {
      const move = moves.get(id);

      if (move === undefined) {
        continue;
      }

      const destinations = destinationsOf(id);
      const siblingStates = destinations.flatMap((destinationId) =>
        [...(origins.get(destinationId) ?? [])].filter((originId) => originId !== id).map((originId) => state.get(originId)),
      );

      if (move.propagateCancel) {
        if (siblingStates.every((siblingState) => siblingState === MOVE_STATE.CANCEL)) {
          const inChain = destinations.filter(
            (destinationId) =>
              state.get(destinationId) !== MOVE_STATE.DONE && moves.get(destinationId)?.locationId === move.locationDestId,
          );

          cancel(inChain.filter((destinationId) => state.get(destinationId) !== MOVE_STATE.CANCEL));
          for (const destinationId of destinations.filter((candidate) => !inChain.includes(candidate))) {
            makeToStock.add(destinationId);
            unlink(id, destinationId);
          }
        }
      } else if (
        siblingStates.every((siblingState) => siblingState === MOVE_STATE.DONE || siblingState === MOVE_STATE.CANCEL)
      ) {
        for (const destinationId of destinations) {
          makeToStock.add(destinationId);
          unlink(id, destinationId);
        }
      }
    }
    for (const id of batch) {
      for (const originId of [...(origins.get(id) ?? [])]) {
        unlink(originId, id);
      }
      makeToStock.add(id);
    }
  };

  cancel([...new Set(cancelled)].filter((id) => moves.has(id)));
  plan.makeToStock = [...makeToStock];

  return plan;
};
