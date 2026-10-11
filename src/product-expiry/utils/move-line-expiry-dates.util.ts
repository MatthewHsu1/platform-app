import { addDays, sameDate } from 'src/product-expiry/utils/lot-dates.util';
import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';
import { type MoveLineDateChange } from 'src/product-expiry/utils/types/move-line-date-change.type';

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();

// A line with a lot shows the lot's expiration date. A line without one, on an operation type that makes lots, gets
// one from its transfer's scheduled date (else the start of today) when it has none yet, and none at all when its
// product does not use expiry. The removal date follows whenever the line's dates are worked out again: the lot's
// when it has one, else the expiration date less the product's removal time on a type that makes lots. A removal
// date given when the line was made, or typed on it later, stays until its lot, product or transfer date changes.
export const planMoveLineExpiryDates = ({
  changed,
  lot,
  usesCreateLots,
  product,
  current,
  scheduledDate,
  today,
}: {
  changed: MoveLineDateChange;
  lot: LotExpiry | null;
  usesCreateLots: boolean;
  product: Pick<ExpiryTimes, 'useExpirationDate' | 'expirationTime' | 'removalTime'>;
  current: LotExpiry;
  scheduledDate: string | null;
  today: Date;
}): Partial<LotExpiry> => {
  if (!changed.created && !changed.lot && !changed.product && !changed.scheduledDate) {
    return {};
  }
  let expirationDate = current.expirationDate;

  if (lot !== null) {
    expirationDate = lot.expirationDate;
  } else if (usesCreateLots && !product.useExpirationDate) {
    expirationDate = null;
  } else if (usesCreateLots && current.expirationDate === null) {
    expirationDate = addDays(scheduledDate ?? startOfUtcDay(today), product.expirationTime);
  }

  // A new line keeps the removal date it was made with.
  const removalGiven = current.removalDate !== null && !changed.lot && !changed.product && !changed.scheduledDate;
  let removalDate = current.removalDate;

  if (!removalGiven && lot !== null && lot.removalDate !== null) {
    removalDate = lot.removalDate;
  } else if (!removalGiven && usesCreateLots) {
    removalDate =
      product.useExpirationDate && expirationDate !== null ? addDays(expirationDate, -product.removalTime) : null;
  }

  const patch: Partial<LotExpiry> = {};

  if (!sameDate(expirationDate, current.expirationDate)) {
    patch.expirationDate = expirationDate;
  }
  if (!sameDate(removalDate, current.removalDate)) {
    patch.removalDate = removalDate;
  }
  return patch;
};
