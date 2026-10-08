import { floatRound } from 'src/shared/utils/float-round.util';
import { computePrice, computeQuantity, type ResolvedUom } from 'src/uom/utils/uom.util';

export type SellerLine = {
  id: string;
  createdAt: string;
  partnerId: string;
  sequence: number;
  minQty: number;
  price: number;
  discount: number;
  productUomId: string;
  productTmplId: string;
  productId: string | null;
  dateStart: string | null;
  dateEnd: string | null;
};

// Dates compare with both ends inclusive; the asked date may carry a time.
const isInDates = (line: SellerLine, date: string) => {
  const day = date.slice(0, 10);
  return (line.dateStart === null || line.dateStart <= day) && (line.dateEnd === null || line.dateEnd >= day);
};

export const selectSeller = ({
  lines,
  variantId,
  productUom,
  quantity,
  uom,
  date,
  partnerId,
  units,
  digits,
}: {
  lines: SellerLine[];
  variantId: string;
  productUom: ResolvedUom;
  quantity: number | null;
  uom: ResolvedUom | null;
  date: string;
  partnerId?: string;
  units: Map<string, ResolvedUom>;
  digits: number;
}) => {
  const passing = lines
    .filter((line) => line.productId === null || line.productId === variantId)
    .sort((a, b) => a.sequence - b.sequence || b.minQty - a.minQty || a.price - b.price || a.createdAt.localeCompare(b.createdAt))
    .filter((line) => {
      if (!isInDates(line, date) || (partnerId !== undefined && line.partnerId !== partnerId)) {
        return false;
      }
      if (quantity === null) {
        return true;
      }
      // Converts only when a unit was asked for; otherwise the raw quantity is compared.
      const lineUom = units.get(line.productUomId) ?? productUom;
      const qtyInLineUom =
        uom === null || uom.id === lineUom.id
          ? quantity
          : computeQuantity({ qty: quantity, from: uom, to: lineUom, digits });
      const step = 10 ** -digits;
      return floatRound(qtyInLineUom, step) >= floatRound(line.minQty, step);
    });

  if (passing.length === 0) {
    return null;
  }
  const vendor = passing[0].partnerId;
  const priceDiscounted = (line: SellerLine) =>
    computePrice({ price: line.price, from: units.get(line.productUomId) ?? productUom, to: productUom }) *
    (1 - line.discount / 100);

  return passing
    .filter((line) => line.partnerId === vendor)
    .sort(
      (a, b) =>
        priceDiscounted(a) - priceDiscounted(b) || a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt),
    )[0];
};
