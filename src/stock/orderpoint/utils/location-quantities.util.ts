import { type LocationStock } from 'src/stock/orderpoint/types/location-stock.type';
import { endOfDay } from 'src/stock/orderpoint/utils/day.util';
import { planProductQuantities } from 'src/stock/utils/plan-product-quantities.util';

// On hand and forecast at the location; the forecast counts the open moves
// dated up to the end of toDay, or all of them when toDay is null.
export const quantitiesUpTo = (
  stock: LocationStock,
  { toDay, digits, now }: { toDay: string | null; digits: number; now: Date },
) => {
  const end = toDay === null ? null : Date.parse(endOfDay(toDay));

  return planProductQuantities({
    products: stock.products,
    scopeLocationIds: stock.scopeLocationIds,
    quants: stock.quants,
    moves: end === null ? stock.moves : stock.moves.filter((move) => Date.parse(move.date) <= end),
    digits,
    now,
  }).products;
};
