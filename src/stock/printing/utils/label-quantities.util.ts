import { StockUserError } from 'src/stock/stock-errors';
import { type LabelMove } from 'src/stock/printing/types/label-move.type';
import { type LabelPrintEntry } from 'src/stock/printing/types/label-print-entry.type';
import { type LotLabelFormat } from 'src/stock/printing/types/lot-label-format.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';

// Thrown while the print page is built, so they show on the opened page.
export const LABEL_ERRORS = {
  positiveQuantity: 'You need to set a positive quantity.',
  noProduct: 'No product to print, if the product is archived please unarchive it before printing its label.',
  serviceProduct: 'Labels cannot be printed for products of service type',
} as const;

const GRIDS: Record<ProductLabelFormat, { columns: number; rows: number; priceIncluded: boolean; isZpl: boolean }> = {
  DYMO: { columns: 1, rows: 1, priceIncluded: false, isZpl: false },
  PRICE_2X7: { columns: 2, rows: 7, priceIncluded: true, isZpl: false },
  PRICE_4X7: { columns: 4, rows: 7, priceIncluded: true, isZpl: false },
  PLAIN_4X12: { columns: 4, rows: 12, priceIncluded: false, isZpl: false },
  PRICE_4X12: { columns: 4, rows: 12, priceIncluded: true, isZpl: false },
  ZPL: { columns: 1, rows: 1, priceIncluded: false, isZpl: true },
  ZPL_PRICE: { columns: 1, rows: 1, priceIncluded: true, isZpl: true },
};

export const labelGrid = (format: ProductLabelFormat) => GRIDS[format];

const add = (totals: Map<string, number>, productId: string, quantity: number) =>
  totals.set(productId, (totals.get(productId) ?? 0) + quantity);

// How many labels each product gets. From a transfer's operation quantities: when no line has a
// quantity yet, each move counts its reserved quantity, else its demand; otherwise the lines count,
// a unit-like line with a lot gives its own labels under the lot name, and a line in another kind of
// unit (weight, length) gives a single label for its product.
export const labelQuantities = ({
  moveQuantity,
  customQuantity,
  productIds,
  moves,
}: {
  moveQuantity: 'MOVE' | 'CUSTOM';
  customQuantity: number;
  productIds: string[];
  moves: LabelMove[];
}) => {
  if (!(customQuantity > 0)) {
    throw new StockUserError(LABEL_ERRORS.positiveQuantity);
  }
  if (productIds.length === 0) {
    throw new StockUserError(LABEL_ERRORS.noProduct);
  }
  const customBarcodes = new Map<string, [string, number][]>();
  const lines = moves.flatMap((move) => move.lines);

  if (moveQuantity === 'MOVE' && moves.length > 0 && lines.every((line) => line.quantity === 0)) {
    const totals = new Map<string, number>();

    for (const move of moves) {
      const usable = move.quantity > 0 ? move.quantity : move.demand;

      if (usable !== 0) {
        add(totals, move.productId, usable);
      }
    }

    return { quantityByProduct: new Map([...totals].map(([id, total]) => [id, Math.trunc(total)])), customBarcodes };
  }
  if (moveQuantity === 'MOVE' && lines.length > 0) {
    const totals = new Map<string, number>();

    for (const line of lines) {
      if (!line.isUnitLike) {
        totals.set(line.productId, 1);
      } else if (line.lotName && Math.trunc(line.quantity) !== 0) {
        customBarcodes.set(line.productId, [...(customBarcodes.get(line.productId) ?? []), [line.lotName, Math.trunc(line.quantity)]]);
      } else {
        add(totals, line.productId, line.quantity);
      }
    }

    return {
      quantityByProduct: new Map([...totals].filter(([, total]) => total !== 0).map(([id, total]) => [id, Math.trunc(total)])),
      customBarcodes,
    };
  }

  return { quantityByProduct: new Map(productIds.map((id) => [id, Math.trunc(customQuantity)])), customBarcodes };
};

export const checkLabelProducts = (products: { isService: boolean }[]) => {
  if (products.some((product) => product.isService)) {
    throw new StockUserError(LABEL_ERRORS.serviceProduct);
  }
};

// The order labels come out in. Each product's own barcode comes first, then its lot names; a
// product with lot labels only joins at the end. Sheets are filled from the last of these
// (products by name, each product's last lot first); Dymo labels follow the products by name from
// Z to A; ZPL labels keep the counted order.
export const labelPrintOrder = ({
  products,
  quantityByProduct,
  customBarcodes,
  layout,
}: {
  products: Map<string, { sortName: string; barcode: string }>;
  quantityByProduct: Map<string, number>;
  customBarcodes: Map<string, [string, number][]>;
  layout: 'SHEET' | 'DYMO' | 'ZPL';
}): LabelPrintEntry[] => {
  const counted = [...quantityByProduct].filter(([id]) => products.has(id));
  const byName =
    layout === 'ZPL'
      ? counted
      : [...counted].sort(([left], [right]) => {
          const leftName = products.get(left)?.sortName ?? '';
          const rightName = products.get(right)?.sortName ?? '';

          return leftName < rightName ? 1 : leftName > rightName ? -1 : 0;
        });
  const groups = new Map<string, LabelPrintEntry[]>(
    byName.map(([productId, quantity]) => [productId, [{ productId, barcode: products.get(productId)?.barcode ?? '', quantity }]]),
  );

  for (const [productId, barcodes] of customBarcodes) {
    if (products.has(productId)) {
      groups.set(productId, [...(groups.get(productId) ?? []), ...barcodes.map(([barcode, quantity]) => ({ productId, barcode, quantity }))]);
    }
  }
  const ordered = [...groups.values()];

  return layout === 'SHEET' ? ordered.reverse().flatMap((group) => [...group].reverse()) : ordered.flat();
};

// One lot label per lot met on the lines, or one per unit of each lot; a lot in another kind of
// unit counts as one.
export const lotLabelLotIds = ({
  labelQuantity,
  lines,
}: {
  labelQuantity: 'LOTS' | 'UNITS';
  lines: { lotId: string | null; quantity: number; isUnitLike: boolean }[];
}) => {
  if (labelQuantity === 'LOTS') {
    return [...new Set(lines.flatMap((line) => (line.lotId === null ? [] : [line.lotId])))];
  }
  const counts = new Map<string, number>();

  for (const line of lines) {
    if (line.lotId !== null) {
      add(counts, line.lotId, line.isUnitLike ? Math.trunc(line.quantity) : 1);
    }
  }

  return [...counts].flatMap(([lotId, count]) => Array.from({ length: Math.max(0, count) }, () => lotId));
};

export const lotLabelOptions = (format: LotLabelFormat) => ({
  labelQuantity: format.includes('LOTS') ? ('LOTS' as const) : ('UNITS' as const),
  printFormat: format.includes('4X12') ? ('4X12' as const) : ('ZPL' as const),
});
