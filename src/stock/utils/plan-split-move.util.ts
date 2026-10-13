import { floatRound } from 'src/shared/utils/float-round.util';
import { compareAtDigits, convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

// `quantity` is what goes to the backorder, in the product unit.
export const planSplitMove = ({
  productQty,
  quantity,
  moveUomId,
  productUomId,
  uoms,
  digits,
}: {
  productQty: number;
  quantity: number;
  moveUomId: string;
  productUomId: string;
  uoms: Map<string, ResolvedUom>;
  digits: number;
}) => {
  if (isZeroAtDigits(quantity, digits)) {
    return null;
  }
  const convert = (qty: number, fromUomId: string, toUomId: string, round: boolean) =>
    convertQuantity({ qty, fromUomId, toUomId, uoms, digits, method: 'HALF-UP', round });
  const inMoveUnit = convert(quantity, productUomId, moveUomId, true);
  const keepsMoveUnit = compareAtDigits(quantity, convert(inMoveUnit, moveUomId, productUomId, true), digits) === 0;
  const left = convert(Math.max(0, productQty - quantity), productUomId, moveUomId, false);

  return {
    newDemand: keepsMoveUnit ? inMoveUnit : quantity,
    newUomId: keepsMoveUnit ? moveUomId : productUomId,
    originalDemand: floatRound(left, 10 ** -digits, 'HALF-UP'),
  };
};
