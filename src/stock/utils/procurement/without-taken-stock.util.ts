import { type ProcurementQuant } from 'src/stock/utils/procurement/types/procurement-quant.type';
import { type TakenStock } from 'src/stock/utils/procurement/types/taken-stock.type';

// The quants as they will be once the taken stock has left its location; the
// free quantity of a quant never drops below nothing.
export const withoutTakenStock = (quants: ProcurementQuant[], taken: TakenStock[]): ProcurementQuant[] => {
  const result = quants.map((quant) => ({ ...quant }));

  for (const take of taken) {
    let remaining = take.quantity;

    for (const quant of result) {
      if (remaining <= 0) {
        break;
      }
      if (quant.productId !== take.productId || quant.locationId !== take.locationId) {
        continue;
      }
      const removed = Math.min(remaining, Math.max(quant.quantity - quant.reservedQuantity, 0));

      quant.quantity -= removed;
      remaining -= removed;
    }
  }

  return result;
};
