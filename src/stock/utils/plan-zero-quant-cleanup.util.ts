import { type CleanupQuant } from 'src/stock/utils/types/cleanup-quant.type';

// Quantities round at max(6, 2 × unit digits) decimals, finer than the unit, so a quantity that only looks
// like zero on screen is kept. Rounding gives 0 exactly below half a step.
const zeroBand = (productUnitDigits: number) => 0.5 * 10 ** -Math.max(6, productUnitDigits * 2);

// Each number that must round to 0; `emptyAllowed`: an empty value counts as 0.
const EMPTY_ROW_NUMBERS = [
  { field: 'quantity', emptyAllowed: true },
  { field: 'reservedQuantity', emptyAllowed: false },
  { field: 'inventoryQuantity', emptyAllowed: true },
] as const;

export const planZeroQuantCleanup = ({
  quants,
  productUnitDigits,
}: {
  quants: CleanupQuant[];
  productUnitDigits: number;
}): string[] => {
  const band = zeroBand(productUnitDigits);

  return quants
    .filter(
      (quant) =>
        EMPTY_ROW_NUMBERS.every(({ field, emptyAllowed }) => {
          const value: number | null = quant[field];

          return value === null ? emptyAllowed : Math.abs(value) < band;
        }) && quant.assignedUserId === null,
    )
    .map((quant) => quant.id);
};

// The same rule as a Twenty filter, so a delete can check it on the row as it is when it is deleted.
export const emptyQuantFilter = (productUnitDigits: number) => {
  const band = zeroBand(productUnitDigits);

  return {
    and: [
      ...EMPTY_ROW_NUMBERS.map(({ field, emptyAllowed }) => {
        const nearZero = { and: [{ [field]: { gt: -band } }, { [field]: { lt: band } }] };

        return emptyAllowed ? { or: [{ [field]: { is: 'NULL' } }, nearZero] } : nearZero;
      }),
      { assignedUserId: { is: 'NULL' } },
    ],
  };
};
