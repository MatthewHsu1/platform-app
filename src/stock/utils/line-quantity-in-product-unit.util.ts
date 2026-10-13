import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

// A line made a moment ago has no product-unit quantity until its trigger
// writes it; until then its own quantity, converted from the line's unit,
// stands in. Read as 0 it would look like nothing moves.
export const lineQuantityInProductUnit = ({
  line,
  productUomId,
  uoms,
  digits,
}: {
  line: { quantity: number | null; quantityProductUom: number | null; productUomId: string | null };
  productUomId: string | null;
  uoms: Map<string, ResolvedUom>;
  digits: number;
}) => {
  if (line.quantityProductUom !== null) {
    return line.quantityProductUom;
  }
  const quantity = line.quantity ?? 0;
  const fromUomId = line.productUomId ?? productUomId;

  if (productUomId === null || fromUomId === null || !uoms.has(fromUomId) || !uoms.has(productUomId)) {
    return quantity;
  }
  return convertQuantity({ qty: quantity, fromUomId, toUomId: productUomId, uoms, digits, method: 'HALF-UP' });
};
