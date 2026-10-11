import { freeQuantityCutoff } from 'src/product-expiry/utils/expiry-quantities.util';
import { removalReached } from 'src/product-expiry/utils/lot-dates.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { addMonths, dayOf, startOfDay } from 'src/stock/orderpoint/utils/day.util';
import { productsLeadDays } from 'src/stock/procurement/product-lead-days';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { FORECAST_MESSAGES } from 'src/stock/reports/forecast/forecast-messages.constant';
import { readForecastMoves, readMovesAsPerson, toForecastMove } from 'src/stock/reports/forecast/read-forecast-moves';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { type ForecastHeading } from 'src/stock/reports/forecast/types/forecast-heading.type';
import { type ForecastMoveNode } from 'src/stock/reports/forecast/types/forecast-move-node.type';
import { type ForecastProduct } from 'src/stock/reports/forecast/types/forecast-product.type';
import { type ForecastRequest } from 'src/stock/reports/forecast/types/forecast-request.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { stockLocations, stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { forecastDraftQuantities, forecastLines } from 'src/stock/utils/forecast-lines.util';
import { planProductQuantities } from 'src/stock/utils/plan-product-quantities.util';
import { stockQuantitySeries } from 'src/stock/utils/stock-quantity-series.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type ForecastExpiry } from 'src/stock/utils/types/forecast-expiry.type';
import { type StockQuantityDay } from 'src/stock/utils/types/stock-quantity-day.type';

type LocationNode = { id: string; usage: string; parentPath: string | null; warehouseId: string | null; active: boolean | null };
type WarehouseNode = { id: string; name: string | null; sequence: number | null; createdAt: string; viewLocationId: string | null; lotStockId: string | null };
type QuantNode = { productId: string; locationId: string; quantity: number | null; reservedQuantity: number | null; removalDate: string | null };
type Target = { productIds: string[]; headings: ForecastHeading[]; warehouseId: string | null; leadHorizonDate: string | null; matchMoveIds: string[] };

// Months of graph on each side of today.
const GRAPH_MONTHS = 3;

const readOne = async <TRow>(objectPlural: string, filterType: string, id: string, selection: string) => {
  const [row] = await findReadableAsPerson<TRow>(objectPlural, filterType, { id: { eq: id } }, selection);

  if (row === undefined) {
    throw new StockUserError(FORECAST_MESSAGES.notFound);
  }
  return row;
};

const variantsOfTemplate = async (templateId: string) =>
  findReadableAsPerson<{ id: string }>(
    'productProducts',
    'ProductProductFilterInput',
    { productTmplId: { eq: templateId }, active: { eq: true } },
    'id',
  );

// A move's report looks at the warehouse it takes stock from when it consumes
// stock, else at the one it brings stock to.
const moveWarehouseId = async (
  move: { locationId: string | null; locationDestId: string | null; pickingTypeId: string | null },
  warehouseOf: (locationId: string | null) => string | null,
) => {
  const [type] =
    move.pickingTypeId === null ? [] : await stockPickingTypes.find<{ code: string }>({ id: { eq: move.pickingTypeId } }, 'code');
  const from = warehouseOf(move.locationId);
  const to = warehouseOf(move.locationDestId);
  const consumes =
    type?.code === PICKING_TYPE_CODE.INTERNAL ||
    type?.code === PICKING_TYPE_CODE.OUTGOING ||
    (from !== null && to !== null && from !== to);

  return consumes ? from : to;
};

const readTarget = async (request: ForecastRequest, warehouseOf: (locationId: string | null) => string | null): Promise<Target> => {
  const base = { warehouseId: request.warehouseId ?? null, leadHorizonDate: null, matchMoveIds: [] };

  if (request.productTemplateId !== undefined) {
    const template = await readOne<{ id: string; name: string | null }>(
      'productTemplates',
      'ProductTemplateFilterInput',
      request.productTemplateId,
      'id name',
    );
    const variants = await variantsOfTemplate(template.id);

    return {
      ...base,
      productIds: variants.map((variant) => variant.id),
      headings: [{ objectNameSingular: 'productTemplate', recordId: template.id, name: template.name ?? '' }],
    };
  }
  if (request.moveId !== undefined) {
    const move = await readOne<{ productId: string; locationId: string | null; locationDestId: string | null; pickingTypeId: string | null }>(
      'stockMoves',
      'StockMoveFilterInput',
      request.moveId,
      'productId locationId locationDestId pickingTypeId',
    );

    return {
      ...base,
      productIds: [move.productId],
      headings: [],
      warehouseId: base.warehouseId ?? (await moveWarehouseId(move, warehouseOf)),
      matchMoveIds: [request.moveId],
    };
  }
  if (request.orderpointId !== undefined) {
    const orderpoint = await readOne<{ productId: string | null; warehouseId: string | null; leadHorizonDate: string | null }>(
      'stockWarehouseOrderpoints',
      'StockWarehouseOrderpointFilterInput',
      request.orderpointId,
      'productId warehouseId leadHorizonDate',
    );

    return {
      ...base,
      productIds: orderpoint.productId === null ? [] : [orderpoint.productId],
      headings: [],
      warehouseId: base.warehouseId ?? orderpoint.warehouseId,
      leadHorizonDate: orderpoint.leadHorizonDate ? dayOf(orderpoint.leadHorizonDate) : null,
    };
  }
  const product = await readOne<{ id: string }>('productProducts', 'ProductProductFilterInput', request.productId ?? '', 'id');

  return { ...base, productIds: [product.id], headings: [] };
};

// The warehouse asked for, else the first active one in warehouse order.
const readWarehouse = async (warehouseId: string | null) => {
  const selection = 'id name sequence createdAt viewLocationId lotStockId';
  const [asked] = warehouseId === null ? [] : await stockWarehouses.find<WarehouseNode>({ id: { eq: warehouseId } }, selection);

  if (asked !== undefined) {
    return asked;
  }
  const active = await stockWarehouses.find<WarehouseNode>({ active: { eq: true } }, selection);

  return active.sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || (left.createdAt < right.createdAt ? -1 : 1))[0];
};

const readQuants = (productIds: string[]) =>
  readInChunks(productIds, (part) =>
    findReadableAsPerson<QuantNode>(
      'stockQuants',
      'StockQuantFilterInput',
      { productId: { in: part } },
      'productId locationId quantity reservedQuantity removalDate',
    ),
  );

const sumByDay = (series: StockQuantityDay[][]) => {
  const byDay = new Map<string, StockQuantityDay>();

  for (const day of series.flat()) {
    const total = byDay.get(day.date) ?? { date: day.date, forecast: 0, incoming: 0, outgoing: 0 };

    byDay.set(day.date, {
      date: day.date,
      forecast: total.forecast + day.forecast,
      incoming: total.incoming + day.incoming,
      outgoing: total.outgoing + day.outgoing,
    });
  }
  return [...byDay.values()].sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
};

// The forecasted report of a product, a move or a reordering rule in one
// warehouse, read as the clicking user. Locations, warehouses, units and move
// links are configuration and are read as the app.
export const readForecastData = async (request: ForecastRequest): Promise<ForecastAnswer> => {
  const settings = readStockSettings();
  const digits = settings.productUnitDigits;
  const now = new Date();
  const today = todayUtc(now);
  const locations = await stockLocations.find<LocationNode>({}, 'id usage parentPath warehouseId active');
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const warehouseOf = (locationId: string | null) => (locationId === null ? null : (locationById.get(locationId)?.warehouseId ?? null));
  const target = await readTarget(request, warehouseOf);
  const warehouse = await readWarehouse(target.warehouseId);
  const viewPath = warehouse?.viewLocationId ? locationById.get(warehouse.viewLocationId)?.parentPath : null;
  const stockPath = warehouse?.lotStockId ? locationById.get(warehouse.lotStockId)?.parentPath : null;

  if (warehouse === undefined || warehouse.lotStockId === null || !viewPath || !stockPath) {
    throw new StockUserError(FORECAST_MESSAGES.noWarehouse);
  }
  const stockLocationId = warehouse.lotStockId;
  // The stored numbers count archived locations of the warehouse too; the
  // lines look at its active locations only.
  const tree = locations.filter((location) => location.parentPath?.startsWith(viewPath) === true);
  const scopeLocationIds = new Set(tree.map((location) => location.id));
  const warehouseLocationIds = new Set(tree.filter((location) => location.active !== false).map((location) => location.id));
  const stockSubLocationIds = new Set(
    tree
      .filter((location) => location.active !== false && location.id !== stockLocationId && location.parentPath?.startsWith(stockPath) === true)
      .map((location) => location.id),
  );

  const [products, uoms] = await Promise.all([readStockProducts(target.productIds), readResolvedUoms()]);
  const productIds = target.productIds.filter((id) => products.has(id));
  const productUnitOf = new Map([...products.values()].map((product) => [product.productId, product.uomId]));
  const toProductUnit = (move: ForecastMoveNode) => {
    const toUomId = productUnitOf.get(move.productId);
    const quantity = move.quantity ?? 0;

    return move.productUomId === null || toUomId === undefined || !uoms.has(move.productUomId) || !uoms.has(toUomId)
      ? quantity
      : convertQuantity({ qty: quantity, fromUomId: move.productUomId, toUomId, uoms, digits, method: 'HALF-UP' });
  };

  const { live, moves, truncated } = await readForecastMoves({ productIds, warehouseLocationIds, toProductUnit });
  const doneSince = startOfDay(addMonths(today, -GRAPH_MONTHS));
  const done = await readMovesAsPerson(
    (part) => ({ productId: { in: part }, state: { eq: MOVE_STATE.DONE }, date: { gte: doneSince } }),
    productIds,
  );
  const quants = (await readQuants(productIds)).map((quant) => ({
    productId: quant.productId,
    locationId: quant.locationId,
    quantity: quant.quantity ?? 0,
    reservedQuantity: quant.reservedQuantity ?? 0,
    removalDate: quant.removalDate || null,
  }));

  // Stock to remove counts as expired from the start of today.
  const expiryCutoff = freeQuantityCutoff(now);
  const isExpired = (quant: { removalDate: string | null }) => removalReached(quant.removalDate, expiryCutoff);
  const expiryProductIds = new Set(productIds.filter((id) => products.get(id)?.useExpirationDate === true));
  const useExpirationDate = expiryProductIds.size > 0;
  const shelfQuants = quants.filter((quant) => warehouseLocationIds.has(quant.locationId) && quant.quantity > 0);
  const freshQuants = useExpirationDate ? shelfQuants.filter((quant) => !isExpired(quant)) : shelfQuants;
  const expiry: ForecastExpiry | undefined = useExpirationDate
    ? {
        productIds: expiryProductIds,
        expiredQuants: shelfQuants.filter(isExpired).map((quant) => ({
          productId: quant.productId,
          reservedQuantity: quant.reservedQuantity,
          availableQuantity: quant.quantity - quant.reservedQuantity,
        })),
        freshQuants: freshQuants.map((quant) => ({
          productId: quant.productId,
          removalDay: quant.removalDate === null ? null : dayOf(quant.removalDate),
          availableQuantity: quant.quantity - quant.reservedQuantity,
        })),
      }
    : undefined;

  const quantities = planProductQuantities({
    products: productIds.flatMap((id) => {
      const product = products.get(id);

      return product === undefined ? [] : [{ id, templateId: product.templateId, productType: product.productType }];
    }),
    scopeLocationIds,
    quants,
    moves: live,
    digits,
    now,
  }).products;
  const drafts = forecastDraftQuantities({ moves: live, warehouseLocationIds });
  const lead = await productsLeadDays({ productIds, locationId: stockLocationId, horizonDays: settings.replenishmentHorizonDays });
  const usageOfLocation = new Map(locations.map((location) => [location.id, location.usage]));
  const warehouseOfLocation = new Map(locations.map((location) => [location.id, location.warehouseId]));
  const doneMoves = done.map((move) => toForecastMove(move, { moveOrigIds: [], moveDestIds: [] }, toProductUnit));
  const graph = sumByDay(
    productIds.map((productId) =>
      stockQuantitySeries({
        warehouseId: warehouse.id,
        moves: [...live, ...doneMoves]
          .filter((move) => move.productId === productId)
          .map((move) => ({
            state: move.state,
            date: move.date,
            productQty: move.productQty,
            quantityProductUom: move.quantity,
            locationId: move.locationId,
            locationDestId: move.locationDestId,
            locationFinalId: move.locationFinalId,
          })),
        quants: quants.filter((quant) => quant.productId === productId),
        warehouseOfLocation,
        usageOfLocation,
        today,
        months: GRAPH_MONTHS,
      }),
    ),
  );

  const productRows = productIds.flatMap((id): ForecastProduct[] => {
    const product = products.get(id);

    if (product === undefined) {
      return [];
    }
    const quantity = quantities.get(id) ?? { qtyAvailable: 0, freeQty: 0, incomingQty: 0, outgoingQty: 0, virtualAvailable: 0 };
    const draft = drafts.get(id) ?? { in: 0, out: 0 };

    return [
      {
        id,
        name: product.displayName,
        uomName: uoms.get(product.uomId)?.name ?? '',
        onHand: quantity.qtyAvailable,
        free: quantity.freeQty,
        incoming: quantity.incomingQty,
        outgoing: quantity.outgoingQty,
        forecast: quantity.virtualAvailable,
        draftIn: draft.in,
        draftOut: draft.out,
        // What expired stock takes out of the forecast.
        toRemove: useExpirationDate
          ? quantity.qtyAvailable + quantity.incomingQty - quantity.outgoingQty - quantity.virtualAvailable
          : null,
        leadDays: lead.get(id) ?? { totalDelay: 0, horizonTime: 0, descriptions: [] },
      },
    ];
  });

  return {
    warehouse: { id: warehouse.id, name: warehouse.name ?? '' },
    headings:
      target.headings.length > 0
        ? target.headings
        : productRows.map((product) => ({ objectNameSingular: 'productProduct', recordId: product.id, name: product.name })),
    products: productRows,
    lines: forecastLines({
      productIds,
      moves,
      quants: freshQuants.map(({ productId, locationId, quantity }) => ({ productId, locationId, quantity })),
      warehouseLocationIds,
      stockLocationId,
      stockSubLocationIds,
      today,
      now: now.toISOString(),
      digits,
      matchMoveIds: target.matchMoveIds,
      expiry,
    }),
    graph,
    leadHorizonDate: target.leadHorizonDate,
    today,
    digits,
    useExpirationDate,
    truncated,
  };
};

