import { translate } from 'src/shared/i18n/translate';
import { pruneEmptyLists } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { readText } from 'src/shared/utils/read-text.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { readLocationQuantities } from 'src/stock/orderpoint/location-quantities';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { type BasedOn } from 'src/stock/orderpoint/types/based-on.type';
import { type ReplenishmentInfo } from 'src/stock/orderpoint/types/replenishment-info.type';
import { endOfDay } from 'src/stock/orderpoint/utils/day.util';
import {
  leadDaysLines,
  replenishmentGraph,
  replenishmentPeriod,
  resupplyOptions,
} from 'src/stock/orderpoint/utils/replenishment-info.util';
import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { stockLocations, stockRoutes } from 'src/stock/routing-records';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE, MOVE_STATE, ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { leadDays } from 'src/stock/utils/procurement/lead-days.util';
import { EndlessRuleLoopError, rulesFromLocation } from 'src/stock/utils/procurement/rules-from-location.util';
import { selectPullRule } from 'src/stock/utils/procurement/select-pull-rule.util';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

type InfoRequest = {
  orderpointId: string;
  basedOn: BasedOn;
  percentFactor: number;
  productMinQty: number | null;
  productMaxQty: number | null;
};

type OrderpointInfoRow = {
  id: string;
  trigger: string;
  autoCreated: boolean | null;
  productId: string | null;
  locationId: string | null;
  warehouseId: string | null;
  routeId: string | null;
  productMinQty: number | null;
  productMaxQty: number | null;
  qtyForecast: number | null;
  qtyToOrder: number | null;
  qtyOnHand: number | null;
  leadHorizonDate: string | null;
  product: { name: string | null; productTmpl: { uom: { name: string | null } | null } | null } | null;
  warehouse: { name: string | null } | null;
};

type ResupplyRoute = {
  id: string;
  name: string | null;
  sequence: number | null;
  createdAt: string;
  supplierWh: { id: string; name: string | null; lotStockId: string | null } | null;
};

const BASED_ON: BasedOn[] = [
  'ONE_WEEK',
  'ONE_MONTH',
  'THREE_MONTHS',
  'ONE_YEAR',
  'LAST_YEAR',
  'LAST_YEAR_2',
  'LAST_YEAR_3',
  'LAST_YEAR_QUARTER',
];

// Moves still to happen count as demand too, as long as they are dated inside the period.
const DEMAND_STATES = [MOVE_STATE.ASSIGNED, MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.DONE];

const ORDERPOINT_INFO_SELECTION =
  'id trigger autoCreated productId locationId warehouseId routeId productMinQty productMaxQty qtyForecast qtyToOrder qtyOnHand leadHorizonDate product { deletedAt name productTmpl { deletedAt uom { deletedAt name } } } warehouse { deletedAt name }';

export const readQuantity = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

export const readReplenishmentInfoRequest = (body: Record<string, unknown>): InfoRequest => ({
  orderpointId: readText(body.orderpointId) ?? '',
  basedOn: BASED_ON.find((candidate) => candidate === body.basedOn) ?? 'ONE_MONTH',
  percentFactor: readQuantity(body.percentFactor) ?? 100,
  productMinQty: readQuantity(body.productMinQty),
  productMaxQty: readQuantity(body.productMaxQty),
});

// The one reordering rule the clicking user asked for, if they may read it.
export const readOrderpointForPerson = async <TRow>(orderpointId: string, selection: string) => {
  const [readable] = orderpointId === '' ? [] : await filterReadableIds('stockWarehouseOrderpoint', 'stockWarehouseOrderpoints', [orderpointId]);
  const [row] = readable === undefined ? [] : await stockWarehouseOrderpoints.find<TRow>({ id: { eq: readable } }, selection);

  if (row === undefined) {
    throw new StockUserError(ORDERPOINT_MESSAGES.notFound);
  }

  return row;
};

// One aggregate read however many moves match: grouped by product, and the
// filter names one product.
const sumProductQty = async (filter: Record<string, unknown>) => {
  const sendable = pruneEmptyLists(filter);

  if (sendable === null) {
    return 0;
  }
  const data = requireData(
    await twentyGraphql<{ stockMovesGroupBy: { sumProductQty: number | null }[] }>(
      'application',
      `query DemandSum($groupBy: [StockMoveGroupByInput!]!, $filter: StockMoveFilterInput) {
        stockMovesGroupBy(groupBy: $groupBy, filter: $filter) { sumProductQty }
      }`,
      { groupBy: [{ productId: true }], filter: sendable },
    ),
    'Sum demand moves',
  );

  return data.stockMovesGroupBy.reduce((sum, group) => sum + (group.sumProductQty ?? 0), 0);
};

// Done and planned moves of the product in the period: out to customers or
// production, less what customers sent back.
const readDemand = async (productId: string, period: { from: string; to: string }) => {
  const locations = await stockLocations.find<{ id: string; usage: string }>(
    { usage: { in: [LOCATION_USAGE.CUSTOMER, LOCATION_USAGE.PRODUCTION] } },
    'id usage',
  );
  const customerIds = locations.filter((location) => location.usage === LOCATION_USAGE.CUSTOMER).map((location) => location.id);
  const inPeriod = {
    productId: { eq: productId },
    state: { in: DEMAND_STATES },
    // Twenty takes one operator per field filter: each end of the period is its own filter.
    and: [{ date: { gte: period.from } }, { date: { lte: endOfDay(period.to.slice(0, 10)) } }],
  };
  const [quantityOut, quantityReturned] = await Promise.all([
    sumProductQty({ ...inPeriod, locationDestId: { in: locations.map((location) => location.id) } }),
    sumProductQty({ ...inPeriod, locationId: { in: customerIds } }),
  ]);

  return { quantityOut, quantityReturned };
};

const rulesOf = (product: RoutingProduct, locationId: string, routeId: string | null, data: RoutingData): RoutingRule[] => {
  try {
    return rulesFromLocation({ product, locationId, routeIds: routeId === null ? [] : [routeId] }, data);
  } catch (error) {
    // A looping chain of rules has no lead time to show; ordering reports the loop.
    if (error instanceof EndlessRuleLoopError) {
      return [];
    }
    throw error;
  }
};

// One row per active route that resupplies the warehouse from another one:
// the free stock there, and the delay of the rule that takes it out.
export const readResupplyOptions = async ({
  warehouseId,
  product,
  data,
  qtyToOrder,
  digits,
}: {
  warehouseId: string;
  product: RoutingProduct;
  data: RoutingData;
  qtyToOrder: number;
  digits: number;
}) => {
  const routes = await stockRoutes.find<ResupplyRoute>(
    { suppliedWhId: { eq: warehouseId }, active: { eq: true } },
    'id name sequence createdAt supplierWh { deletedAt id name lotStockId }',
  );
  const supplied = routes
    .filter((route) => route.supplierWh?.lotStockId)
    .sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt));
  const stockIds = [...new Set(supplied.map((route) => route.supplierWh?.lotStockId ?? ''))];
  const stockNames = new Map(
    (await stockLocations.find<{ id: string; name: string | null; completeName: string | null }>(
      { id: { in: stockIds } },
      'id name completeName',
    )).map((location) => [location.id, textOrNull(location.completeName) ?? location.name ?? '']),
  );
  const rows = [];

  for (const route of supplied) {
    const supplier = route.supplierWh;
    const lotStockId = supplier?.lotStockId;

    if (!supplier || !lotStockId) {
      continue;
    }
    const quantities = await readLocationQuantities({ productIds: [product.id], locationId: lotStockId, toDays: [null], digits });
    const rule = selectPullRule(
      { product, locationId: lotStockId, values: { routeIds: [route.id], warehouseId: supplier.id } },
      data,
    );

    rows.push({
      routeId: route.id,
      routeName: route.name ?? '',
      warehouseName: supplier.name ?? '',
      locationName: stockNames.get(lotStockId) ?? '',
      freeQty: quantities.get(null)?.get(product.id)?.freeQty ?? 0,
      leadTime: leadDays(rule === null ? [] : [rule], null).totalDelay,
    });
  }

  return resupplyOptions(rows, qtyToOrder);
};

export const readReplenishmentInfo = async (request: InfoRequest, locale: string): Promise<ReplenishmentInfo> => {
  const row = await readOrderpointForPerson<OrderpointInfoRow>(request.orderpointId, ORDERPOINT_INFO_SELECTION);
  const settings = readStockSettings();
  const digits = settings.productUnitDigits;
  const productMinQty = request.productMinQty ?? row.productMinQty ?? 0;
  const productMaxQty = request.productMaxQty ?? row.productMaxQty ?? 0;
  const qtyToOrder = row.qtyToOrder ?? 0;
  const routing = row.productId === null ? null : await readRoutingData([row.productId]);
  const product = row.productId === null ? undefined : routing?.products.get(row.productId);
  const rules =
    product === undefined || routing === null || row.locationId === null ? [] : rulesOf(product, row.locationId, row.routeId, routing.data);
  const delays = leadDays(rules, settings.replenishmentHorizonDays);
  const period = replenishmentPeriod(request.basedOn, new Date().toISOString());
  const demand = row.productId === null ? { quantityOut: 0, quantityReturned: 0 } : await readDemand(row.productId, period);
  const options =
    product === undefined || routing === null || row.warehouseId === null
      ? []
      : await readResupplyOptions({ warehouseId: row.warehouseId, product, data: routing.data, qtyToOrder, digits });

  return {
    productName: row.product?.name ?? '',
    warehouseName: row.warehouse?.name ?? '',
    uomName: row.product?.productTmpl?.uom?.name ?? '',
    productMinQty,
    productMaxQty,
    leadDays: {
      today: todayUtc(),
      lines: leadDaysLines(
        delays.descriptions.map((line) => ({
          label: translate(locale, line.label.message, line.label.values),
          value: translate(locale, line.value.message, line.value.values),
        })),
      ),
      leadHorizonDate: row.leadHorizonDate,
      trigger: row.trigger,
      qtyForecast: row.qtyForecast ?? 0,
      qtyToOrder,
      // A manual row the replenishment screen made, not one a person saved.
      virtual: row.trigger === ORDERPOINT_TRIGGER.MANUAL && row.autoCreated === true,
    },
    graph: {
      ...replenishmentGraph({
        ...demand,
        periodDays: period.days,
        percentFactor: request.percentFactor,
        productMinQty,
        productMaxQty,
        digits,
      }),
      productMinQty,
      qtyOnHand: row.qtyOnHand ?? 0,
      leadTime: delays.totalDelay,
    },
    options,
  };
};
