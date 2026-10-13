import { type WaveLine } from 'src/stock-picking-batch/types/wave-line.type';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';

type WaveSplitPlan = {
  pickingId: string;
  lineIds: string[];
  wholeMoveIds: string[];
  splitMoves: { moveId: string; quantity: number; lineIds: string[] }[];
};

const sameSet = (left: string[], right: string[]) =>
  new Set(left).size === new Set(right).size && left.every((id) => right.includes(id));

// A transfer joins the wave whole when all its lines and all its moves are
// chosen, each move with a quantity. Otherwise the chosen part goes to a new
// transfer: a move whose lines are all chosen goes whole, any other move is
// split for the quantity of its chosen lines.
export const planAddToWave = ({
  lines,
  pickings,
  moves,
  digits,
}: {
  lines: WaveLine[];
  pickings: { id: string; lineIds: string[]; moveIds: string[] }[];
  moves: { id: string; lineIds: string[] }[];
  digits: number;
}) => {
  const wholePickingIds: string[] = [];
  const splits: WaveSplitPlan[] = [];

  for (const pickingId of [...new Set(lines.map((entry) => entry.pickingId))]) {
    const taken = lines.filter((entry) => entry.pickingId === pickingId);
    const takenMoveIds = [...new Set(taken.map((entry) => entry.moveId))];
    const quantityByMove = new Map<string, number>();

    taken.forEach((entry) => quantityByMove.set(entry.moveId, (quantityByMove.get(entry.moveId) ?? 0) + entry.quantityProductUom));
    const picking = pickings.find((candidate) => candidate.id === pickingId);
    const everyMoveHasQuantity = takenMoveIds.every((moveId) => !isZeroAtDigits(quantityByMove.get(moveId) ?? 0, digits));

    if (
      picking !== undefined &&
      sameSet(
        taken.map((entry) => entry.id),
        picking.lineIds,
      ) &&
      sameSet(takenMoveIds, picking.moveIds) &&
      everyMoveHasQuantity
    ) {
      wholePickingIds.push(pickingId);
      continue;
    }
    const wholeMoveIds: string[] = [];
    const splitMoves: WaveSplitPlan['splitMoves'] = [];

    for (const moveId of takenMoveIds) {
      const moveLineIds = taken.filter((entry) => entry.moveId === moveId).map((entry) => entry.id);

      if (sameSet(moveLineIds, moves.find((candidate) => candidate.id === moveId)?.lineIds ?? [])) {
        wholeMoveIds.push(moveId);
      } else {
        splitMoves.push({ moveId, quantity: quantityByMove.get(moveId) ?? 0, lineIds: moveLineIds });
      }
    }
    splits.push({ pickingId, lineIds: taken.map((entry) => entry.id), wholeMoveIds, splitMoves });
  }
  return { wholePickingIds, splits };
};
