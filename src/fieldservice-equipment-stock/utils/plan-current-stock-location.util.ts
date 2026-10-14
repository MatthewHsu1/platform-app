import { type SerialQuant } from 'src/fieldservice-equipment-stock/types/serial-quant.type';

// A machine sits where the newest stock of its serial is. Newest is the latest incoming date (a stock row without
// one is older than any with one), then the latest creation. Stock that is gone, or below zero, is not there.
export const planCurrentStockLocation = (quants: SerialQuant[]): string | null => {
  const newest = quants
    .filter((quant) => quant.quantity > 0)
    .sort((first, second) => (second.inDate ?? '').localeCompare(first.inDate ?? '') || second.createdAt.localeCompare(first.createdAt))[0];

  return newest?.locationId ?? null;
};
