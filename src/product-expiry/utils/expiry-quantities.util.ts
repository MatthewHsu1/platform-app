import { removalReached } from 'src/product-expiry/utils/lot-dates.util';

// Stock to be removed before the move happens cannot serve it; stock without a removal date never expires.
export const keepFreshForReservation = <TQuant extends { removalDate?: string | null }>({
  quants,
  useExpirationDate,
  moveDate,
}: {
  quants: TQuant[];
  useExpirationDate: boolean;
  moveDate: string;
}): TQuant[] =>
  useExpirationDate
    ? quants.filter((quant) => !quant.removalDate || Date.parse(quant.removalDate) >= Date.parse(moveDate))
    : quants;

// A product's free and forecast quantities count a lot as expired from the start of today (UTC): a lot to be removed
// later today still counts until tomorrow. A single stock row's available quantity uses the exact time instead.
export const freeQuantityCutoff = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export const expiredUnreserved = (
  quants: { quantity: number; reservedQuantity: number; removalDate?: string | null }[],
  now: Date,
) =>
  quants
    .filter((quant) => removalReached(quant.removalDate ?? null, freeQuantityCutoff(now)))
    .reduce((sum, quant) => sum + quant.quantity - quant.reservedQuantity, 0);

// On hand stays as it is: expired stock is still on the shelf until someone removes it.
export const withExpiredUnreserved = <TQuantities extends { freeQty: number; virtualAvailable: number }>(
  quantities: TQuantities,
  expired: number,
): TQuantities => ({
  ...quantities,
  freeQty: quantities.freeQty - expired,
  virtualAvailable: quantities.virtualAvailable - expired,
});

export const quantAvailableQuantity = ({
  quantity,
  reservedQuantity,
  removalDate,
  useExpirationDate,
  now,
}: {
  quantity: number;
  reservedQuantity: number;
  removalDate: string | null;
  useExpirationDate: boolean;
  now: Date;
}) => (useExpirationDate && removalReached(removalDate, now) ? 0 : quantity - reservedQuantity);
