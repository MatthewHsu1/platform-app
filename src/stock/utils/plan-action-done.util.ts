import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { compareAtDigits, convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type ActionDoneMove } from 'src/stock/utils/types/action-done-move.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';
import { type ActionDoneLine } from 'src/stock/utils/types/action-done-line.type';

type ActionDonePlan = {
  cancelMoveIds: string[];
  destroyLineIds: string[];
  todoMoveIds: string[];
  commitLineIds: string[];
  splitMoveIds: string[];
};

// Which moves are cancelled, done or split, and which lines are destroyed or committed.
// The cancel test reads the quantity before the unpicked lines go; the to-do test after.
export const planActionDone = ({
  moves,
  cancelBackorder,
  uoms,
  digits,
}: {
  moves: ActionDoneMove[];
  cancelBackorder: boolean;
  uoms: Map<string, ResolvedUom>;
  digits: number;
}): ActionDonePlan => {
  const plan: ActionDonePlan = { cancelMoveIds: [], destroyLineIds: [], todoMoveIds: [], commitLineIds: [], splitMoveIds: [] };

  for (const move of moves) {
    if (move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL) {
      continue;
    }
    const inMoveUnit = (line: ActionDoneLine) =>
      convertQuantity({ qty: line.quantity, fromUomId: line.productUomId, toUomId: move.productUomId, uoms, digits, round: false });
    const quantityBefore = move.lines.reduce((sum, line) => sum + inMoveUnit(line), 0);
    const unpicked = move.picked ? move.lines.filter((line) => !line.picked) : [];
    const kept = move.lines.filter((line) => !unpicked.includes(line));

    plan.destroyLineIds.push(...unpicked.map((line) => line.id));

    if ((quantityBefore <= 0 || !move.picked) && !move.isInventory) {
      if (compareAtDigits(move.productUomQty, 0, digits) === 0 || cancelBackorder) {
        plan.cancelMoveIds.push(move.id);
        continue;
      }
    }

    const quantityAfter = kept.reduce((sum, line) => sum + inMoveUnit(line), 0);

    if (!move.picked || (quantityAfter <= 0 && !move.isInventory)) {
      continue;
    }
    plan.todoMoveIds.push(move.id);

    for (const line of kept) {
      if (compareAtDigits(line.quantity, 0, digits) === 0 && !move.isInventory) {
        plan.destroyLineIds.push(line.id);
      } else {
        plan.commitLineIds.push(line.id);
      }
    }

    if (!cancelBackorder && compareAtDigits(quantityAfter, move.productUomQty, digits) < 0) {
      plan.splitMoveIds.push(move.id);
    }
  }

  return plan;
};
