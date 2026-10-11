import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export const LOT_QUANTITY_NOT_POSITIVE = 'The quantity per lot should always be a positive value.';

// The series continues the last run of digits in the first name, with its
// zero padding; the text around it stays. BigInt keeps long serials exact.
export const generateLotNames = (firstLot: string, count: number): string[] => {
  const numbers = firstLot.match(/\d+/g);

  if (numbers === null) {
    return generateLotNames(`${firstLot}0`, count);
  }
  const initialNumber = numbers[numbers.length - 1];
  const pieces = firstLot.split(initialNumber);
  const prefix = pieces.slice(0, -1).join(initialNumber);
  const suffix = pieces[pieces.length - 1];
  const start = BigInt(initialNumber);

  return Array.from(
    { length: count },
    (_, index) =>
      `${prefix}${(start + BigInt(index)).toString().padStart(initialNumber.length, '0')}${suffix}`,
  );
};

export const nextSerial = ({
  tracking,
  newestLotName,
}: {
  tracking: ProductTracking;
  newestLotName: string | null;
}): string | null =>
  tracking === PRODUCT_TRACKING.NONE || !newestLotName
    ? null
    : generateLotNames(newestLotName, 2)[1];

export const generateLotQuantities = (quantity: number, quantityPerLot: number): number[] | null => {
  if (quantityPerLot <= 0) {
    return null;
  }
  const leftover = quantity % quantityPerLot;
  // Dividing first can round up past a whole lot (1 / 0.1 is 10 while
  // 1 % 0.1 still leaves almost 0.1), which would add an extra lot.
  const fullLots = Math.round((quantity - leftover) / quantityPerLot);
  const quantities: number[] = Array.from({ length: fullLots }, () => quantityPerLot);

  return leftover === 0 ? quantities : [...quantities, leftover];
};
