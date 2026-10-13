import { floatRound } from 'src/shared/utils/float-round.util';
import { type BasedOn } from 'src/stock/orderpoint/types/based-on.type';
import { addMonths } from 'src/stock/orderpoint/utils/day.util';

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar months that keep the time of day; the 31st falls back to the last day of a shorter month.
const shiftMonths = (dateTime: string, months: number) => `${addMonths(dateTime.slice(0, 10), months)}${dateTime.slice(10)}`;

// The past period the demand is measured over. The rolling periods end now;
// the "last year" ones are whole calendar months a year back.
export const replenishmentPeriod = (basedOn: BasedOn, now: string) => {
  let from = now;
  let to = now;

  if (basedOn === 'ONE_WEEK') {
    from = new Date(Date.parse(now) - 7 * DAY_MS).toISOString();
  } else if (basedOn === 'ONE_MONTH') {
    from = shiftMonths(now, -1);
  } else if (basedOn === 'THREE_MONTHS') {
    from = shiftMonths(now, -3);
  } else if (basedOn === 'ONE_YEAR') {
    from = shiftMonths(now, -12);
  } else {
    const date = new Date(now);
    const monthsLater = basedOn === 'LAST_YEAR_2' ? 1 : basedOn === 'LAST_YEAR_3' ? 2 : 0;

    from = new Date(Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth() + monthsLater, 1)).toISOString();
    to = shiftMonths(from, basedOn === 'LAST_YEAR_QUARTER' ? 3 : 1);
  }

  return { from, to, days: Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS) };
};

// Daily demand over the period, and the stock curve it gives between min and
// max: it starts at max, falls to min after one ordering period, is refilled
// to max, three times over.
export const replenishmentGraph = ({
  quantityOut,
  quantityReturned,
  periodDays,
  percentFactor,
  productMinQty,
  productMaxQty,
  digits,
}: {
  quantityOut: number;
  quantityReturned: number;
  periodDays: number;
  percentFactor: number;
  productMinQty: number;
  productMaxQty: number;
  digits: number;
}) => {
  const max = Math.max(productMaxQty, productMinQty);
  const dailyDemand = periodDays > 0 ? ((quantityOut - quantityReturned) / periodDays) * (percentFactor / 100) : 0;
  const averageStock = productMinQty + (max - productMinQty) / 2;
  // Equal min and max still refill: one unit is taken as the gap.
  const orderingPeriod = dailyDemand === 0 ? 0 : Math.max(1, Math.trunc((max - productMinQty || 1) / dailyDemand));
  const curve = dailyDemand === 0 ? [] : [max, productMinQty, max, productMinQty, max, productMinQty];

  return {
    productMaxQty: max,
    dailyDemand: floatRound(dailyDemand, 10 ** -digits),
    averageStock: floatRound(averageStock, 10 ** -digits),
    orderingPeriod,
    curve,
  };
};

// The pop-up lists the lead-time lines from the time horizon back to the first rule.
export const leadDaysLines = <TLine,>(lines: TLine[]) => [...lines].reverse();

// Most free stock first; equal ones keep the route order.
export const resupplyOptions = <TRow extends { freeQty: number }>(rows: TRow[], qtyToOrder: number) =>
  [...rows]
    .sort((left, right) => right.freeQty - left.freeQty)
    .map((row) => ({ ...row, tooLow: row.freeQty < qtyToOrder }));

// Min and max saved from the pop-up. A max left at 0 follows min; a max typed
// below min is refused, as a save of the rule itself is.
export const planMinMaxSave = ({ productMinQty, productMaxQty }: { productMinQty: number; productMaxQty: number }) => {
  if (productMinQty <= productMaxQty) {
    return { kind: 'write' as const, data: { productMinQty, productMaxQty } };
  }
  if (productMaxQty === 0) {
    return { kind: 'write' as const, data: { productMinQty, productMaxQty: productMinQty } };
  }

  return { kind: 'refused' as const };
};
