import { floatRound, type RoundingMethod } from 'src/shared/utils/float-round.util';
import { computeQuantity } from 'src/uom/utils/uom.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export const convertQuantity = ({
  qty,
  fromUomId,
  toUomId,
  uoms,
  digits,
  method = 'HALF-UP',
  round = true,
}: {
  qty: number;
  fromUomId: string;
  toUomId: string;
  uoms: Map<string, ResolvedUom>;
  digits: number;
  method?: RoundingMethod;
  round?: boolean;
}) => {
  const from = uoms.get(fromUomId);
  const to = uoms.get(toUomId);

  if (from === undefined || to === undefined) {
    throw new Error(`Unknown unit ${from === undefined ? fromUomId : toUomId}.`);
  }

  return computeQuantity({ qty, from, to, digits, round, method });
};

// Two quantities are equal when they round to the same value at the
// "Product Unit" precision.
export const compareAtDigits = (a: number, b: number, digits: number): -1 | 0 | 1 => {
  const difference = floatRound(a - b, 10 ** -digits, 'HALF-UP');

  return difference === 0 ? 0 : difference < 0 ? -1 : 1;
};

export const isZeroAtDigits = (value: number, digits: number) => compareAtDigits(value, 0, digits) === 0;
