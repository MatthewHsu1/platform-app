import { floatRound } from 'src/shared/utils/float-round.util';
import { LOCATION_USAGE, MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ReturnAllMove } from 'src/stock/utils/types/return-all-move.type';
import { type ReturnRow } from 'src/stock/utils/types/return-row.type';
import { type ReturnRowMove } from 'src/stock/utils/types/return-row-move.type';
import { type ReturnRowsPlan } from 'src/stock/utils/types/return-rows-plan.type';
import { type PickingState } from 'src/stock/types/picking-state.type';

// Moves into an inventory location (scrap, count adjustments) are not returned.
export const planReturnRows = ({
  pickingCount,
  pickingState,
  moves,
}: {
  pickingCount: number;
  pickingState: PickingState;
  moves: ReturnRowMove[];
}): ReturnRowsPlan => {
  if (pickingCount !== 1) {
    return { kind: 'refuse', reason: 'You may only return one picking at a time.' };
  }
  if (pickingState !== PICKING_STATE.DONE) {
    return { kind: 'refuse', reason: 'You may only return Done pickings.' };
  }
  const rows = moves
    .filter((move) => move.state !== MOVE_STATE.CANCEL && move.locationDestUsage !== LOCATION_USAGE.INVENTORY)
    .map((move) => ({ moveId: move.id, productId: move.productId, uomId: move.productUomId, quantity: 0 }));

  if (rows.length === 0) {
    return {
      kind: 'refuse',
      reason: 'No products to return (only lines in Done state and not fully returned yet can be returned).',
    };
  }

  return { kind: 'rows', rows };
};

// Only destination moves that are returns of this very move count as already returned.
export const planReturnAll = ({
  rows,
  moves,
  digits,
}: {
  rows: ReturnRow[];
  moves: ReturnAllMove[];
  digits: number;
}): ReturnRow[] => {
  const byId = new Map(moves.map((move) => [move.id, move]));

  return rows.map((row) => {
    const move = byId.get(row.moveId);

    if (move === undefined) {
      return row;
    }
    const alreadyReturned = move.destinationMoves
      .filter((destination) => destination.originReturnedMoveId === move.id)
      .reduce((total, destination) => total + (destination.quantity ?? 0), 0);

    return { ...row, quantity: floatRound((move.quantity ?? 0) - alreadyReturned, 10 ** -digits, 'HALF-UP') };
  });
};

export const applyTypedQuantities = (rows: ReturnRow[], typed: { moveId: string; quantity: number }[]) => {
  const quantityByMove = new Map(typed.map((entry) => [entry.moveId, entry.quantity]));

  return rows.map((row) => ({ ...row, quantity: quantityByMove.get(row.moveId) ?? row.quantity }));
};

export const hasNonZeroQuantity = (rows: ReturnRow[], digits: number) =>
  rows.some((row) => !isZeroAtDigits(row.quantity, digits));
