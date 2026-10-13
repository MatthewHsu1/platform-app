import { floatRound } from 'src/shared/utils/float-round.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ReservationLine } from 'src/stock/quant/types/reservation-line.type';

const newestFirst = (left: ReservationLine, right: ReservationLine) =>
  right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);

export const planOverReservationCutBack = ({
  quantity,
  reservedQuantity,
  lines,
  digits,
}: {
  quantity: number;
  reservedQuantity: number;
  lines: ReservationLine[];
  digits: number;
}) => {
  const destroy: string[] = [];
  const shrink: { id: string; quantity: number; quantityProductUom: number }[] = [];
  const changedMoveIds = new Set<string>();
  let excess = reservedQuantity - quantity;

  const candidates = lines
    .filter((line) => !line.picked && compareAtDigits(line.quantityProductUom, 0, digits) > 0)
    .sort(newestFirst);

  for (const line of candidates) {
    if (compareAtDigits(excess, 0, digits) <= 0) {
      break;
    }
    if (line.moveId !== null) {
      changedMoveIds.add(line.moveId);
    }
    if (compareAtDigits(line.quantityProductUom, excess, digits) <= 0) {
      destroy.push(line.id);
      excess -= line.quantityProductUom;
      continue;
    }
    const keptProductUom = floatRound(line.quantityProductUom - excess, 10 ** -digits, 'HALF-UP');
    const keptLineUnit = floatRound((keptProductUom * line.quantity) / line.quantityProductUom, 10 ** -digits, 'HALF-UP');
    shrink.push({ id: line.id, quantity: keptLineUnit, quantityProductUom: keptProductUom });
    excess = 0;
  }

  return { destroy, shrink, changedMoveIds: [...changedMoveIds] };
};
