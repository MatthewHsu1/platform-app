import { quantAvailableQuantity } from 'src/product-expiry/utils/expiry-quantities.util';
import { floatRound } from 'src/shared/utils/float-round.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';

const roundAtDigits = (value: number, digits: number) => floatRound(value, 10 ** -digits, 'HALF-UP');

export const planInDate = ({
  existing,
  incomingInDate,
  bypassesReservation,
  now,
  digits,
}: {
  existing: { quantity: number; inDate: string | null } | null;
  incomingInDate: string | null;
  bypassesReservation: boolean;
  now: string;
  digits: number;
}) => {
  const dates: string[] = [];

  if (!bypassesReservation && existing !== null && existing.inDate !== null && compareAtDigits(existing.quantity, 0, digits) > 0) {
    dates.push(existing.inDate);
  }
  if (incomingInDate !== null) {
    dates.push(incomingInDate);
  }

  return dates.length === 0 ? now : dates.reduce((oldest, date) => (date < oldest ? date : oldest));
};

const availableOf = (quant: QuantSnapshot, quantity: number, reservedQuantity: number, now: string, digits: number) =>
  roundAtDigits(
    quantAvailableQuantity({
      quantity,
      reservedQuantity,
      removalDate: quant.removalDate ?? null,
      useExpirationDate: quant.useExpirationDate === true,
      now: new Date(now),
    }),
    digits,
  );

const outdated = (quant: QuantSnapshot, quantity: number, digits: number) =>
  compareAtDigits((quant.inventoryQuantity ?? 0) - (quant.inventoryDiffQuantity ?? 0), quantity, digits) !== 0;

export const planQuantDeltaWrite = ({
  quant,
  delta,
  incomingInDate,
  bypassesReservation,
  now,
  digits,
}: {
  quant: QuantSnapshot;
  delta: number;
  incomingInDate: string | null;
  bypassesReservation: boolean;
  now: string;
  digits: number;
}) => {
  const quantity = roundAtDigits(quant.quantity + delta, digits);
  const inDate = planInDate({ existing: quant, incomingInDate, bypassesReservation, now, digits });
  const data: Record<string, unknown> = {
    quantity,
    availableQuantity: availableOf(quant, quantity, quant.reservedQuantity, now, digits),
    inDate,
    version: quant.version + 1,
  };

  if (quant.inventoryQuantitySet) {
    data.isOutdated = outdated(quant, quantity, digits);
  }

  return { data, quantity, inDate };
};

// A write of quantity or reserved (the ledger repair, the reserved recompute).
export const planQuantWrite = ({
  quant,
  quantity,
  reservedQuantity,
  digits,
  now,
}: {
  quant: QuantSnapshot;
  quantity?: number;
  reservedQuantity?: number;
  digits: number;
  now: string;
}) => {
  const nextQuantity = quantity ?? quant.quantity;
  const nextReserved = reservedQuantity ?? quant.reservedQuantity;
  const data: Record<string, unknown> = {
    ...(quantity === undefined ? {} : { quantity: roundAtDigits(quantity, digits) }),
    ...(reservedQuantity === undefined ? {} : { reservedQuantity: roundAtDigits(reservedQuantity, digits) }),
    availableQuantity: availableOf(quant, nextQuantity, nextReserved, now, digits),
    version: quant.version + 1,
  };

  if (quantity !== undefined && quant.inventoryQuantitySet) {
    data.isOutdated = outdated(quant, nextQuantity, digits);
  }

  return data;
};
