import { freeQuantityCutoff } from 'src/product-expiry/utils/expiry-quantities.util';
import { isLotExpired, removalReached } from 'src/product-expiry/utils/lot-dates.util';
import { type ExpiryLine } from 'src/product-expiry/utils/types/expiry-line.type';
import { type ExpiryQuestion } from 'src/product-expiry/utils/types/expiry-question.type';
import { type LotToRemind } from 'src/product-expiry/utils/types/lot-to-remind.type';

// A line counts as expired when its lot is past its expiration date, or when the line itself is past its removal
// date, which also covers a lot not made yet.
const isExpiredLine = (line: ExpiryLine, now: Date) =>
  (line.lotId !== null && isLotExpired(line.lotExpirationDate, now)) || removalReached(line.removalDate, now);

export const expiryConfirmationNeeded = (lines: ExpiryLine[], now: Date): ExpiryQuestion | null => {
  const expired = lines.filter((line) => isExpiredLine(line, now));

  if (expired.length === 0) {
    return null;
  }
  const lotIds = [...new Set(expired.flatMap((line) => (line.lotId === null ? [] : [line.lotId])))];
  // With one expired lot the question names that lot; with none it names the lot the first expired line will make.
  const named = (lotIds.length === 1 ? expired.find((line) => line.lotId === lotIds[0]) : undefined) ?? expired[0];

  return {
    pickingIds: [...new Set(expired.map((line) => line.pickingId))],
    lotIds,
    productName: named.productName,
    lotName: named.lotName ?? '',
  };
};

// Only lines of products that use expiry dates and whose removal date is already behind now are dropped; a removal
// date of this very moment does not count yet here, unlike for the question.
export const planDiscardExpired = (lines: ExpiryLine[], now: Date) =>
  lines
    .filter((line) => line.useExpirationDate && !!line.removalDate && Date.parse(line.removalDate) < now.getTime())
    .map((line) => line.id);

// An alert date counts from the start of its day (UTC), as free stock does. Each lot is reminded once, even if its
// alert date is moved later, and only while some of it is in stock.
export const lotsToRemind = (lots: LotToRemind[], stockedLotIds: Set<string>, today: Date) => {
  const cutoff = freeQuantityCutoff(today).getTime();

  return lots
    .filter(
      (lot) =>
        !lot.productExpiryReminded && !!lot.alertDate && Date.parse(lot.alertDate) <= cutoff && stockedLotIds.has(lot.id),
    )
    .map((lot) => lot.id);
};
