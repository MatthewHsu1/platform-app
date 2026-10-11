import { CREATE_BACKORDER, MOVE_STATE } from 'src/stock/stock-options.constant';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type CreateBackorder } from 'src/stock/types/create-backorder.type';
import { type BackorderMove } from 'src/stock/utils/types/backorder-move.type';

export const pickedQuantity = (move: BackorderMove) =>
  move.picked && move.lines.some((line) => !line.picked)
    ? move.lines.filter((line) => line.picked).reduce((sum, line) => sum + line.quantityInMoveUnit, 0)
    : move.quantity;

export const planBackorderNeeded = ({
  createBackorder,
  moves,
  digits,
}: {
  createBackorder: CreateBackorder;
  moves: BackorderMove[];
  digits: number;
}) =>
  createBackorder === CREATE_BACKORDER.ASK &&
  moves
    .filter((move) => move.state !== MOVE_STATE.CANCEL)
    .some(
      (move) =>
        (move.productUomQty !== 0 && !move.picked) || compareAtDigits(pickedQuantity(move), move.productUomQty, digits) < 0,
    );

export const planNoBackorder = ({
  pickings,
  cancelBackorder,
}: {
  pickings: { id: string; createBackorder: CreateBackorder }[];
  cancelBackorder: boolean | undefined;
}) =>
  pickings
    .filter(
      (picking) =>
        picking.createBackorder === CREATE_BACKORDER.NEVER ||
        (cancelBackorder === true && picking.createBackorder !== CREATE_BACKORDER.ALWAYS),
    )
    .map((picking) => picking.id);
