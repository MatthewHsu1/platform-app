import { sameDate } from 'src/product-expiry/utils/lot-dates.util';
import { planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';
import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';
import { type LotQuant } from 'src/product-expiry/utils/types/lot-quant.type';

// A lot's stock rows carry both its dates as they are, and the stock of a row stops being available once the
// removal date is reached. Each write goes with the row's version, like every other write of a stock row.
export const planLotQuantDates = ({
  lots,
  quants,
  now,
  digits,
}: {
  lots: (LotExpiry & { id: string })[];
  quants: LotQuant[];
  now: string;
  digits: number;
}) => {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));

  return quants.flatMap((quant) => {
    const lot = lotById.get(quant.lotId);

    if (lot === undefined || (sameDate(lot.expirationDate, quant.expirationDate) && sameDate(lot.removalDate, quant.removalDate ?? null))) {
      return [];
    }
    const data: Record<string, unknown> = {
      expirationDate: lot.expirationDate,
      removalDate: lot.removalDate,
      ...planQuantWrite({ quant: { ...quant, removalDate: lot.removalDate }, digits, now }),
    };

    return [{ id: quant.id, version: quant.version, data }];
  });
};
