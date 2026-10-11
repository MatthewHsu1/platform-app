import { defineLogicFunction } from 'twenty-sdk/define';

import { floatRound } from 'src/shared/utils/float-round.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { readScopeLocationIds } from 'src/stock/product/recompute-product-quantities';
import { INVENTORY_AT_DATE_MESSAGES } from 'src/stock/reports/inventory-at-date/inventory-at-date-messages.constant';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { findAsPerson } from 'src/stock/stock-person-writes';
import {
  INVENTORY_AT_DATE_ROUTE_PATH,
  INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type InventoryAtDateRow } from 'src/stock/types/inventory-at-date-row.type';
import {
  compareInventoryProducts,
  doneMovesAfter,
  inventoryAtDate,
  inventoryAtDatePage,
  matchesProductSearch,
} from 'src/stock/utils/inventory-at-date.util';
import { computeQuantity } from 'src/uom/utils/uom.util';

type ListedVariant = { id: string; name: string | null; defaultCode: string | null };

type PageVariant = {
  id: string;
  qtyAvailable: number | null;
  productTmpl: { uomId: string; uom: { name: string | null } | null } | null;
};

type DoneMove = {
  productId: string;
  date: string;
  quantity: number | null;
  productUomId: string;
  locationId: string | null;
  locationDestId: string | null;
};

// Active variants of storable products, as the clicking user may read them. A
// filter on the product's storable flag through the relation is refused, so
// the storable products are read first.
const readStorableVariants = async () => {
  const templates = await findAsPerson<{ id: string }>(
    'productTemplates',
    'ProductTemplateFilterInput',
    { isStorable: { eq: true } },
    'id',
  );
  const variants = await readInChunks(
    templates.map(({ id }) => id),
    (part) =>
      findAsPerson<ListedVariant>(
        'productProducts',
        'ProductProductFilterInput',
        { productTmplId: { in: part }, active: { eq: true } },
        'id name defaultCode',
      ),
  );

  return variants.map((variant) => ({
    id: variant.id,
    name: textOrNull(variant.name) ?? '',
    defaultCode: textOrNull(variant.defaultCode),
  }));
};

const handler = stockRouteHandler(async (body) => {
  const atTime = typeof body.at === 'string' ? Date.parse(body.at) : Number.NaN;

  if (Number.isNaN(atTime)) {
    throw new StockUserError(INVENTORY_AT_DATE_MESSAGES.noDate);
  }
  const at = new Date(atTime).toISOString();
  const search = typeof body.search === 'string' ? body.search : '';
  const listed = (await readStorableVariants())
    .filter((variant) => matchesProductSearch(variant, search))
    .sort(compareInventoryProducts);
  const page = inventoryAtDatePage(listed, typeof body.offset === 'number' ? body.offset : 0);
  const pageIds = page.rows.map(({ id }) => id);

  if (pageIds.length === 0) {
    return { at, offset: page.offset, hasMore: page.hasMore, rows: [] };
  }

  const digits = readStockSettings().productUnitDigits;
  const [variants, moves, scopeLocationIds, units] = await Promise.all([
    findAsPerson<PageVariant>(
      'productProducts',
      'ProductProductFilterInput',
      { id: { in: pageIds } },
      'id qtyAvailable productTmpl { deletedAt uomId uom { deletedAt name } }',
    ),
    findAsPerson<DoneMove>(
      'stockMoves',
      'StockMoveFilterInput',
      { state: { eq: MOVE_STATE.DONE }, date: { gt: at }, productId: { in: pageIds } },
      'productId date quantity productUomId locationId locationDestId',
    ),
    readScopeLocationIds(),
    readResolvedUoms(),
  ]);
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const after = doneMovesAfter({
    moves: moves.map((move) => {
      const quantity = move.quantity ?? 0;
      const from = units.get(move.productUomId);
      const to = units.get(variantById.get(move.productId)?.productTmpl?.uomId ?? move.productUomId);

      return {
        productId: move.productId,
        date: move.date,
        locationId: move.locationId ?? '',
        locationDestId: move.locationDestId ?? '',
        // Each done quantity converts to the product unit rounding up; only the final total rounds half-up.
        quantityProductUom:
          from !== undefined && to !== undefined ? computeQuantity({ qty: quantity, from, to, digits, method: 'UP' }) : quantity,
      };
    }),
    scopeLocationIds,
    at,
  });
  const rows: InventoryAtDateRow[] = page.rows.map((listedVariant) => {
    const variant = variantById.get(listedVariant.id);
    const moved = after.get(listedVariant.id) ?? { in: 0, out: 0 };

    return {
      productId: listedVariant.id,
      name: listedVariant.name,
      defaultCode: listedVariant.defaultCode,
      uomName: variant?.productTmpl?.uom?.name ?? '',
      quantity: floatRound(inventoryAtDate(variant?.qtyAvailable ?? 0, moved.in, moved.out), 10 ** -digits, 'HALF-UP'),
    };
  });

  return { at, offset: page.offset, hasMore: page.hasMore, rows };
});

export default defineLogicFunction({
  universalIdentifier: INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-inventory-at-date',
  description: 'One page of storable products with their quantity on hand at a past date.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: INVENTORY_AT_DATE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
