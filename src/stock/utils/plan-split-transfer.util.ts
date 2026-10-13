import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type SplitMove } from 'src/stock/utils/types/split-move.type';
import { type SplitTransferPlan } from 'src/stock/utils/types/split-transfer-plan.type';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

// The checks look at every move of the transfer, done and cancelled ones too.
export const planSplitTransfer = ({
  name,
  moves,
  digits,
}: {
  name: string;
  moves: SplitMove[];
  digits: number;
}): SplitTransferPlan => {
  const quantityOf = (move: SplitMove) => move.quantity ?? 0;
  const refuse = (reason: string): SplitTransferPlan => ({ kind: 'refuse', reason, values: { name } });

  if (moves.every((move) => compareAtDigits(quantityOf(move), 0, digits) === 0)) {
    return refuse('{name}: Nothing to split. Fill the quantities you want in a new transfer in the done quantities');
  }
  if (moves.every((move) => compareAtDigits(quantityOf(move), move.productUomQty, digits) === 0)) {
    return refuse('{name}: Nothing to split, all demand is done. For split you need at least one line not fully fulfilled');
  }
  if (moves.some((move) => compareAtDigits(quantityOf(move), move.productUomQty, digits) > 0)) {
    return refuse("{name}: Can't split: quantities done can't be above demand");
  }

  const splitMoves = moves.filter(
    (move) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL && quantityOf(move) !== 0,
  );

  if (
    splitMoves.some(
      (move) => move.state === MOVE_STATE.DRAFT && compareAtDigits(quantityOf(move), move.productUomQty, digits) < 0,
    )
  ) {
    return refuse('You cannot split a draft move. It needs to be confirmed first.');
  }

  return {
    kind: 'split',
    splitMoveIds: splitMoves.map((move) => move.id),
    zeroMoveIds: moves.filter((move) => quantityOf(move) === 0).map((move) => move.id),
  };
};
