import { floatRound } from 'src/shared/utils/float-round.util';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type CheckMove } from 'src/stock/utils/types/check-move.type';
import { type CheckPicking } from 'src/stock/utils/types/check-picking.type';

export const EMPTY_TRANSFER_MESSAGE =
  "You can't validate an empty transfer. Please add some products to move before proceeding.";
export const ZERO_QUANTITY_MESSAGE =
  "Transfer trouble alert! Validating a zero quantity transfer? You're not moving invisible goods around are you?\nSet some quantities and let's get moving!";
export const EMPTY_TRANSFERS_MESSAGE = 'Transfers {names}: Please add some items to move.';
export const ROUNDING_MESSAGE =
  'The quantity done for the product "{product}" doesn\'t respect the rounding precision defined on the unit of measure "{unit}". Please change the quantity done or the rounding precision of your unit of measure.';
export const NEGATIVE_QUANTITY_MESSAGE = 'No negative quantities allowed';

const isLive = (move: CheckMove) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL;

const fill = (message: string, values: Record<string, string>) =>
  message.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);

const hasNoQuantity = (picking: CheckPicking, digits: number) => {
  const hasPick = picking.moves.some((move) => move.picked && isLive(move));

  return picking.moves
    .filter((move) => isLive(move) && (!hasPick || move.picked))
    .every((move) => isZeroAtDigits(move.quantity, digits));
};

// One transfer gets the first refusal that applies; several get one joined message, and
// the zero-quantity check is skipped for them. `showTransfers` false treats several transfers
// as one (the whole of one batch): the single-transfer refusals apply to them all.
export const planSanityCheck = ({
  pickings,
  digits,
  trackingMessages,
  showTransfers = pickings.length > 1,
}: {
  pickings: CheckPicking[];
  digits: number;
  trackingMessages: string[];
  showTransfers?: boolean;
}): string | null => {
  const withoutMoves = pickings.filter((picking) => picking.moves.length === 0 && picking.lineCount === 0);

  if (!showTransfers) {
    if (withoutMoves.length > 0) {
      return EMPTY_TRANSFER_MESSAGE;
    }
    if (pickings.some((picking) => hasNoQuantity(picking, digits))) {
      return ZERO_QUANTITY_MESSAGE;
    }
    return trackingMessages.length > 0 ? trackingMessages.join('\n\n') : null;
  }

  const parts = [
    ...(withoutMoves.length > 0
      ? [fill(EMPTY_TRANSFERS_MESSAGE, { names: withoutMoves.map((picking) => picking.name).join(', ') })]
      : []),
    ...trackingMessages,
  ];

  return parts.length > 0 ? parts.join('\n\n') : null;
};

// Only the lines Validate keeps: picked lines of picked moves that will be done. Unpicked lines
// and moves with nothing to do are dropped by the run, so their quantities do not matter.
export const planLineRefusals = ({ pickings, digits }: { pickings: CheckPicking[]; digits: number }): string | null => {
  const toDo = pickings
    .flatMap((picking) => picking.moves)
    .filter((move) => isLive(move) && move.picked && (move.quantity > 0 || move.isScrap));

  for (const move of toDo) {
    for (const line of move.lines.filter((item) => item.picked)) {
      if (line.quantity < 0 && !isZeroAtDigits(line.quantity, digits)) {
        return NEGATIVE_QUANTITY_MESSAGE;
      }
      // Sums of floats carry noise far below the precision; only a real extra decimal refuses.
      if (Math.abs(floatRound(line.quantity, 10 ** -digits, 'HALF-UP') - line.quantity) > 10 ** -(digits + 3)) {
        return fill(ROUNDING_MESSAGE, { product: move.productName, unit: move.uomName });
      }
    }
  }

  return null;
};

// A picker who typed quantities but ticked nothing means "everything as typed".
// Scrap moves (destination usage INVENTORY) do not count as picked.
export const planPreDonePicked = (picking: CheckPicking): string[] => {
  const hasQuantity = picking.moves.some((move) => move.quantity !== 0);
  const hasPick = picking.moves.some((move) => !move.isScrap && move.picked);

  return hasQuantity && !hasPick ? picking.moves.map((move) => move.id) : [];
};
