import { groupBy } from 'src/shared/utils/group-by.util';

export const INVENTORY_AT_DATE_PAGE_SIZE = 80;

export const inventoryAtDate = (onHandNow: number, doneInAfter: number, doneOutAfter: number) =>
  onHandNow - doneInAfter + doneOutAfter;

// Per product, what the done moves after the date brought into the warehouses and took out of them.
export const doneMovesAfter = ({
  moves,
  scopeLocationIds,
  at,
}: {
  moves: { productId: string; date: string; quantityProductUom: number; locationId: string; locationDestId: string }[];
  scopeLocationIds: Set<string>;
  at: string;
}) => {
  const atTime = Date.parse(at);
  const totals = new Map<string, { in: number; out: number }>();

  for (const move of moves) {
    if (Date.parse(move.date) <= atTime) {
      continue;
    }
    const fromInside = scopeLocationIds.has(move.locationId);
    const toInside = scopeLocationIds.has(move.locationDestId);

    if (fromInside === toInside) {
      continue;
    }
    const total = totals.get(move.productId) ?? { in: 0, out: 0 };

    if (toInside) {
      total.in += move.quantityProductUom;
    } else {
      total.out += move.quantityProductUom;
    }
    totals.set(move.productId, total);
  }

  return totals;
};

// The same totals in each product's unit. The quantities are summed per move
// unit first and each sum is converted once, so rounding a conversion up adds
// at most one step per unit, not one per move.
export const doneMovesAfterInProductUnit = ({
  moves,
  scopeLocationIds,
  at,
  toProductUnit,
}: {
  moves: { productId: string; date: string; quantity: number; productUomId: string; locationId: string; locationDestId: string }[];
  scopeLocationIds: Set<string>;
  at: string;
  toProductUnit: (quantity: number, fromUomId: string, productId: string) => number;
}) => {
  const totals = new Map<string, { in: number; out: number }>();

  for (const [uomId, unitMoves] of groupBy(moves, (move) => move.productUomId)) {
    const inUnit = doneMovesAfter({
      moves: unitMoves.map((move) => ({ ...move, quantityProductUom: move.quantity })),
      scopeLocationIds,
      at,
    });

    for (const [productId, moved] of inUnit) {
      const total = totals.get(productId) ?? { in: 0, out: 0 };

      total.in += toProductUnit(moved.in, uomId, productId);
      total.out += toProductUnit(moved.out, uomId, productId);
      totals.set(productId, total);
    }
  }

  return totals;
};

// A search text matched anywhere in a value with ilike: the pattern's own wildcards and escape are taken literally.
export const containsPattern = (search: string) => `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
