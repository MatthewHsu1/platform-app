import { parseQuantKey, quantKey } from 'src/stock/quant/quant-key';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

// A done line took its lot below zero: stock without a lot at the same location, package and owner becomes that lot,
// as much as is free there and no more than the line moved.
export const planLotCompensation = ({
  key,
  lotAvailable,
  noLotFree,
  quantity,
  digits,
}: {
  key: string;
  lotAvailable: number;
  noLotFree: number;
  quantity: number;
  digits: number;
}): { noLotKey: string; quantity: number } | null => {
  const parts = parseQuantKey(key);

  if (parts.lotId === null || compareAtDigits(lotAvailable, 0, digits) >= 0) {
    return null;
  }
  const taken = Math.min(noLotFree, Math.abs(quantity));

  return compareAtDigits(taken, 0, digits) > 0 ? { noLotKey: quantKey({ ...parts, lotId: null }), quantity: taken } : null;
};
