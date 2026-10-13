import { isLotExpired } from 'src/product-expiry/utils/lot-dates.util';
import { stockLots } from 'src/stock/lot/lot-records';

// The one writer of a lot's "Expired" flag.
export const recomputeLotExpiry = async (lotIds: string[], now = new Date()) => {
  const lots = await stockLots.find<{ id: string; expirationDate: string | null; productExpiryAlert: boolean | null }>(
    { id: { in: [...new Set(lotIds)] } },
    'id expirationDate productExpiryAlert',
  );

  for (const lot of lots) {
    const expired = isLotExpired(lot.expirationDate, now);

    if (expired !== (lot.productExpiryAlert === true)) {
      await stockLots.update(lot.id, { productExpiryAlert: expired });
    }
  }
};
