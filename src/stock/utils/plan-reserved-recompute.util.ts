import { parseQuantKey } from 'src/stock/quant/quant-key';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

// The keys whose reserved quantity is wrong: a stored reservation that differs from the open lines taking
// from the key (none on a location that bypasses reservation), or open lines on a key that stores none.
// Recomputing only these gives the same rows as recomputing every key.
export const planReservedRecompute = ({
  reservedQuants,
  openLines,
  bypassLocationIds,
  digits,
}: {
  reservedQuants: { quantKey: string; reservedQuantity: number }[];
  openLines: { key: string; quantityProductUom: number }[];
  bypassLocationIds: string[];
  digits: number;
}): string[] => {
  const bypass = new Set(bypassLocationIds);
  const isBypassed = (key: string) => bypass.has(parseQuantKey(key).locationId);
  const lineSums = new Map<string, number>();

  for (const line of openLines) {
    lineSums.set(line.key, (lineSums.get(line.key) ?? 0) + line.quantityProductUom);
  }
  const stored = new Set(reservedQuants.map((quant) => quant.quantKey));
  const fromQuants = reservedQuants
    .filter(
      (quant) =>
        isBypassed(quant.quantKey) ||
        compareAtDigits(quant.reservedQuantity, lineSums.get(quant.quantKey) ?? 0, digits) !== 0,
    )
    .map((quant) => quant.quantKey);
  const fromLines = [...lineSums]
    .filter(([key, sum]) => !stored.has(key) && !isBypassed(key) && compareAtDigits(sum, 0, digits) !== 0)
    .map(([key]) => key);

  return [...new Set([...fromQuants, ...fromLines])];
};
