import { floatRound } from 'src/shared/utils/float-round.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';
import { computeQuantity } from 'src/uom/utils/uom.util';

// Round the quantity up to a whole number of the multiple unit, then convert
// it back to the product unit. No multiple: unchanged.
export const multipleRoundedQty = ({
  qty,
  productUom,
  multiple,
  digits,
}: {
  qty: number;
  productUom: ResolvedUom;
  multiple: ResolvedUom | null;
  digits: number;
}) => {
  if (multiple === null) {
    return qty;
  }
  const inMultiple = computeQuantity({ qty, from: productUom, to: multiple, digits });

  return computeQuantity({ qty: floatRound(inMultiple, 1, 'UP'), from: multiple, to: productUom, digits });
};
