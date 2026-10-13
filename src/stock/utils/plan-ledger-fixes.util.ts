import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type LedgerDifference } from 'src/stock/utils/types/ledger-difference.type';
import { type LedgerQuant } from 'src/stock/utils/types/ledger-quant.type';

export const ledgerDifferences = ({
  totals,
  quants,
  digits,
}: {
  totals: Map<string, number>;
  quants: LedgerQuant[];
  digits: number;
}): LedgerDifference[] => {
  const quantByKey = new Map(quants.map((quant) => [quant.quantKey, quant]));
  const keys = [...new Set([...totals.keys(), ...quantByKey.keys()])];

  return keys.flatMap((key) => {
    const quant = quantByKey.get(key);
    const quantity = quant?.quantity ?? 0;
    const ledgerTotal = totals.get(key) ?? 0;

    return compareAtDigits(quantity, ledgerTotal, digits) === 0
      ? []
      : [
          {
            key,
            quantId: quant?.id ?? null,
            version: quant?.version ?? null,
            quantity,
            reservedQuantity: quant?.reservedQuantity ?? 0,
            ledgerTotal,
          },
        ];
  });
};

// A posting still in flight changes the row (new version) or the difference within the wait,
// so only what stayed exactly the same is wrong.
export const planLedgerFixes = ({
  first,
  second,
  digits,
}: {
  first: LedgerDifference[];
  second: LedgerDifference[];
  digits: number;
}): LedgerDifference[] => {
  const secondByKey = new Map(second.map((difference) => [difference.key, difference]));

  return first.flatMap((before) => {
    const after = secondByKey.get(before.key);

    if (
      after === undefined ||
      after.quantId !== before.quantId ||
      after.version !== before.version ||
      compareAtDigits(after.quantity, before.quantity, digits) !== 0 ||
      compareAtDigits(after.ledgerTotal, before.ledgerTotal, digits) !== 0
    ) {
      return [];
    }

    return [after];
  });
};
