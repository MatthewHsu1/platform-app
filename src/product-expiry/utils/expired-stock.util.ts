import { planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ExpiringQuant } from 'src/product-expiry/utils/types/expiring-quant.type';

// A stock row's available quantity is stored, but it changes with the clock once the removal date comes; the row is
// written with its version, like every other write of a stock row, and only when the stored value is out of date.
export const planExpiredQuantWrites = ({ quants, now, digits }: { quants: ExpiringQuant[]; now: string; digits: number }) =>
  quants.flatMap((quant) => {
    const data = planQuantWrite({ quant, digits, now });
    const available = data.availableQuantity as number;

    return quant.availableQuantity !== null && compareAtDigits(quant.availableQuantity, available, digits) === 0
      ? []
      : [{ id: quant.id, version: quant.version, data }];
  });
