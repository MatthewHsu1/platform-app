import { floatRound } from 'src/shared/utils/float-round.util';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';
import { type ForecastRow } from 'src/stock/utils/types/forecast-row.type';

// A delivery line covered by stock on hand.
const isOnHand = (line: ForecastLine) =>
  line.documentIn === null && !line.inTransit && line.replenishmentFilled && line.documentOut !== null;

// Stock no delivery takes, apart from stock to remove now.
const isFreeStock = (line: ForecastLine) =>
  line.documentIn === null && !line.inTransit && line.replenishmentFilled && line.documentOut === null && line.removalDate !== 'NOW';

const sameDocumentOut = (left: ForecastLine, right: ForecastLine) =>
  left.documentOut !== null &&
  right.documentOut !== null &&
  left.documentOut.id === right.documentOut.id &&
  left.documentOut.name === right.documentOut.name;

const availableOf = (line: ForecastLine): ForecastRow['available'] => {
  if (line.documentIn !== null) {
    return 'receipt';
  }
  if (line.inTransit) {
    return line.moveOutId !== null ? 'stockInTransit' : 'freeStockInTransit';
  }
  if (!line.replenishmentFilled) {
    return 'notAvailable';
  }
  if (line.documentOut !== null) {
    return 'stockToReserve';
  }
  return line.removalDate === 'NOW' ? 'expired' : 'freeStock';
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// The forecast lines as the report shows them: grouped by variant, stock to
// remove now first, the empty or already-listed free stock left out, and the
// Reserve / Unreserve button each delivery line offers.
export const forecastRows = ({
  lines,
  productIds,
  freeQtyOf,
  useExpirationDate,
  digits,
}: {
  lines: ForecastLine[];
  productIds: string[];
  freeQtyOf: (productId: string) => number;
  useExpirationDate: boolean;
  digits: number;
}): ForecastRow[] => {
  const productRank = new Map(productIds.map((id, index) => [id, index]));
  const rankOf = (line: ForecastLine) => productRank.get(line.productId) ?? productIds.length;
  let shown = lines.map((line) => ({ ...line }));

  if (useExpirationDate) {
    shown = [...shown.filter((line) => line.removalDate === 'NOW'), ...shown.filter((line) => line.removalDate !== 'NOW')];
  }
  if (productIds.length > 1) {
    shown = [...shown].sort((left, right) => rankOf(left) - rankOf(right));
  }
  const linesOf = (productId: string) => shown.filter((line) => line.productId === productId);
  const onHandOf = new Map(
    [...new Set(shown.map((line) => line.productId))].map((productId) => [productId, linesOf(productId).filter(isOnHand)]),
  );
  // Stock on hand a Reserve click can still take: covered lines not reserved yet.
  const reservableOf = (productId: string) =>
    sum((onHandOf.get(productId) ?? []).map((line) => (line.reservation === null ? line.quantity : 0)));
  const dropped = new Set<ForecastLine>();

  for (const productId of onHandOf.keys()) {
    const productLines = linesOf(productId);
    const free = productLines.filter(isFreeStock);

    if (productLines.length > 1 && free.length === 1 && free[0].quantity === 0) {
      dropped.add(free[0]);
    }
    if (!useExpirationDate) {
      continue;
    }
    // The dated free stock is listed on its own lines; the undated line keeps the rest.
    const undated = free.find((line) => line.removalDate === null);
    const dated = free.filter((line) => line.removalDate !== null);

    if (undated !== undefined && dated.length > 0) {
      undated.quantity = floatRound(undated.quantity - sum(dated.map((line) => line.quantity)), 10 ** -digits);
      if (undated.quantity === 0) {
        dropped.add(undated);
      }
    }
  }
  const kept = shown.filter((line) => !dropped.has(line));

  return kept.map((line, index) => {
    const previous = index > 0 ? kept[index - 1] : null;
    const onHand = onHandOf.get(line.productId) ?? [];
    // A delivery already shown on the line above, or covered by stock on
    // another line, offers its button there only.
    const splitLine =
      previous === null ||
      (previous.productId === line.productId &&
        (sameDocumentOut(line, previous) || onHand.some((other) => sameDocumentOut(other, line))));
    const showsButton =
      !line.inTransit && line.documentOut !== null && (isOnHand(line) || (freeQtyOf(line.productId) > 0 && !splitLine));
    const reservable = reservableOf(line.productId);
    let action: ForecastRow['action'] = null;

    if (showsButton && line.reservation !== null) {
      action = { kind: 'unreserve' };
    } else if (showsButton && (line.replenishmentFilled || reservable > 0)) {
      action = { kind: 'reserve', quantity: reservable > 0 && !isOnHand(line) ? Math.min(reservable, line.quantity) : null };
    }

    return {
      line,
      available: availableOf(line),
      action,
      startsProduct: previous === null || previous.productId !== line.productId,
    };
  });
};
