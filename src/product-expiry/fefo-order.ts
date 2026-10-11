import { compareCreation, compareInDate } from 'src/stock/removal/removal-compare';
import { type FefoQuant } from 'src/product-expiry/types/fefo-quant.type';

type Dated = Omit<FefoQuant, 'removalDate'> & { removalDate?: string | null };

// Stock without a removal date goes after every dated quant.
const compareRemovalDate = (left: Dated, right: Dated) => {
  if (!left.removalDate || !right.removalDate) {
    return Number(!left.removalDate) - Number(!right.removalDate);
  }

  return Date.parse(left.removalDate) - Date.parse(right.removalDate);
};

// First expiry, first out: the earliest removal date first, then the oldest stock, then the oldest row.
export const compareFefo = (left: Dated, right: Dated) =>
  compareRemovalDate(left, right) || compareInDate(left, right) || compareCreation(left, right);

export const fefoOrder = <TQuant extends FefoQuant>(quants: readonly TQuant[]): TQuant[] => [...quants].sort(compareFefo);
