import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { type ReplenishedMove } from 'src/stock/orderpoint/types/replenished-move.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// The refusal of a click that finished an earlier, stopped Replenish instead of
// its own: it names that order with what could be read of it, so the person
// checks it rather than orders the same goods again.
export const replayedOrderText = (move: ReplenishedMove | null): TranslatableText => {
  if (move === null) {
    return { message: ORDERPOINT_MESSAGES.replenishFinishedEarlierUnread };
  }
  const { quantity, unitName, pickingName } = move;
  const unit = unitName === '' ? null : unitName;

  if (pickingName === null) {
    return unit === null
      ? { message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoTransferNoUnit, values: { quantity } }
      : { message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoTransfer, values: { quantity, unit } };
  }

  return unit === null
    ? { message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoUnit, values: { quantity, transfer: pickingName } }
    : { message: ORDERPOINT_MESSAGES.replenishFinishedEarlier, values: { quantity, unit, transfer: pickingName } };
};
