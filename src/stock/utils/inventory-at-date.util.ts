const PAGE_SIZE = 80;

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

const compareText = (a: string, b: string) => a.localeCompare(b, 'en');

// The product list order: internal reference, then name, then id; a product with no reference comes last.
export const compareInventoryProducts = (
  a: { id: string; name: string; defaultCode: string | null },
  b: { id: string; name: string; defaultCode: string | null },
) => {
  if (a.defaultCode !== b.defaultCode) {
    if (a.defaultCode === null) {
      return 1;
    }
    if (b.defaultCode === null) {
      return -1;
    }
    const byCode = compareText(a.defaultCode, b.defaultCode);

    if (byCode !== 0) {
      return byCode;
    }
  }

  return compareText(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

export const matchesProductSearch = (row: { name: string; defaultCode: string | null }, search: string) => {
  const needle = search.trim().toLowerCase();

  return (
    needle.length === 0 ||
    row.name.toLowerCase().includes(needle) ||
    (row.defaultCode ?? '').toLowerCase().includes(needle)
  );
};

export const inventoryAtDatePage = <TRow>(rows: TRow[], offset: number, pageSize = PAGE_SIZE) => {
  const start = Number.isInteger(offset) && offset > 0 ? offset : 0;

  return { rows: rows.slice(start, start + pageSize), offset: start, hasMore: start + pageSize < rows.length };
};
