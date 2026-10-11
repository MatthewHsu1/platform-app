import { defineLogicFunction } from 'twenty-sdk/define';

import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { floatRound } from 'src/shared/utils/float-round.util';
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
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import {
  containsPattern,
  doneMovesAfterInProductUnit,
  INVENTORY_AT_DATE_PAGE_SIZE,
  inventoryAtDate,
} from 'src/stock/utils/inventory-at-date.util';

type PageVariant = {
  id: string;
  name: string | null;
  defaultCode: string | null;
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

// The product list order. An empty internal reference is stored as NULL, so
// products without one come last.
const ORDER_BY = [{ defaultCode: 'AscNullsLast' }, { name: 'AscNullsLast' }, { id: 'AscNullsFirst' }];

// One page of the active variants of storable products the clicking user can read.
const readVariantPage = async (search: string, offset: number) => {
  const text = search.trim();
  const filter = {
    active: { eq: true },
    productTmpl: { isStorable: { eq: true } },
    ...(text.length === 0
      ? {}
      : { or: [{ name: { ilike: containsPattern(text) } }, { defaultCode: { ilike: containsPattern(text) } }] }),
  };
  const data = requireData(
    await twentyGraphql<{
      productProducts: { edges: { node: PageVariant }[]; pageInfo: { hasNextPage: boolean } };
    }>(
      'person',
      `query InventoryAtDatePage($filter: ProductProductFilterInput, $orderBy: [ProductProductOrderByInput], $offset: Int, $first: Int) {
        productProducts(filter: $filter, orderBy: $orderBy, offset: $offset, first: $first) {
          edges { node { id name defaultCode qtyAvailable productTmpl { deletedAt uomId uom { deletedAt name } } } }
          pageInfo { hasNextPage }
        }
      }`,
      { filter, orderBy: ORDER_BY, offset, first: INVENTORY_AT_DATE_PAGE_SIZE },
    ),
    'Read productProducts',
  );

  return {
    variants: data.productProducts.edges.map(({ node }) => node),
    hasMore: data.productProducts.pageInfo.hasNextPage,
  };
};

const handler = stockRouteHandler(async (body) => {
  const atTime = typeof body.at === 'string' ? Date.parse(body.at) : Number.NaN;

  if (Number.isNaN(atTime)) {
    throw new StockUserError(INVENTORY_AT_DATE_MESSAGES.noDate);
  }
  const at = new Date(atTime).toISOString();
  const offset = typeof body.offset === 'number' && Number.isInteger(body.offset) && body.offset > 0 ? body.offset : 0;
  const { variants, hasMore } = await readVariantPage(typeof body.search === 'string' ? body.search : '', offset);

  if (variants.length === 0) {
    return { at, offset, hasMore, rows: [] };
  }

  const digits = readStockSettings().productUnitDigits;
  const [moves, scopeLocationIds, units] = await Promise.all([
    findAsPerson<DoneMove>(
      'stockMoves',
      'StockMoveFilterInput',
      { state: { eq: MOVE_STATE.DONE }, date: { gt: at }, productId: { in: variants.map(({ id }) => id) } },
      'productId date quantity productUomId locationId locationDestId',
    ),
    readScopeLocationIds(),
    readResolvedUoms(),
  ]);
  const productUnit = new Map(variants.map((variant) => [variant.id, variant.productTmpl?.uomId ?? '']));
  const after = doneMovesAfterInProductUnit({
    moves: moves.map((move) => ({
      productId: move.productId,
      date: move.date,
      quantity: move.quantity ?? 0,
      productUomId: move.productUomId,
      locationId: move.locationId ?? '',
      locationDestId: move.locationDestId ?? '',
    })),
    scopeLocationIds,
    at,
    toProductUnit: (quantity, fromUomId, productId) =>
      convertQuantity({ qty: quantity, fromUomId, toUomId: productUnit.get(productId) ?? '', uoms: units, digits, method: 'UP' }),
  });
  const rows: InventoryAtDateRow[] = variants.map((variant) => {
    const moved = after.get(variant.id) ?? { in: 0, out: 0 };

    return {
      productId: variant.id,
      name: textOrNull(variant.name) ?? '',
      defaultCode: textOrNull(variant.defaultCode),
      uomName: variant.productTmpl?.uom?.name ?? '',
      quantity: floatRound(inventoryAtDate(variant.qtyAvailable ?? 0, moved.in, moved.out), 10 ** -digits, 'HALF-UP'),
    };
  });

  return { at, offset, hasMore, rows };
});

export default defineLogicFunction({
  universalIdentifier: INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-inventory-at-date',
  description: 'One page of storable products with their quantity on hand at a past date.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: INVENTORY_AT_DATE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
