import { groupBy } from 'src/shared/utils/group-by.util';
import { readLocationStock } from 'src/stock/orderpoint/location-quantities';
import { ORDERPOINT_VALUE_SELECTION, stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { readOrderpointRules, readRouteRuleCandidates } from 'src/stock/orderpoint/orderpoint-routing';
import { type OrderpointRow } from 'src/stock/orderpoint/types/orderpoint-row.type';
import { type OrderpointValuesInput } from 'src/stock/orderpoint/types/orderpoint-values-input.type';
import { defaultOrderpointRoute } from 'src/stock/orderpoint/utils/default-orderpoint-route.util';
import { quantitiesUpTo } from 'src/stock/orderpoint/utils/location-quantities.util';
import { orderpointLeadTimes } from 'src/stock/orderpoint/utils/orderpoint-lead-times.util';
import { readScopeLocationIds } from 'src/stock/product/recompute-product-quantities';
import { stockRouteCategs } from 'src/stock/routing-records';
import { productProducts } from 'src/stock/stock-records';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

type ProductOwner = { productTemplateId: string; productName: string; responsibleId: string | null };

type OrderpointContext =
  | { kind: 'input'; row: OrderpointRow; input: OrderpointValuesInput }
  | { kind: 'loop'; row: OrderpointRow; owner: ProductOwner; error: TranslatableText };

type Located = OrderpointRow & { productId: string; locationId: string };

const readProductOwners = async (productIds: string[]) => {
  const variants = await productProducts.find<{
    id: string;
    name: string | null;
    productTmplId: string;
    productTmpl: { responsibleId: string | null } | null;
  }>({ id: { in: productIds } }, 'id name productTmplId productTmpl { deletedAt responsibleId }');

  return new Map(
    variants.map((variant): [string, ProductOwner] => [
      variant.id,
      {
        productTemplateId: variant.productTmplId,
        productName: variant.name ?? '',
        responsibleId: variant.productTmpl?.responsibleId ?? null,
      },
    ]),
  );
};

// Own routes of each category, not the inherited ones.
const readCategoryRouteIds = async (categoryIds: string[]) => {
  const links = await stockRouteCategs.find<{ productCategoryId: string; stockRouteId: string }>(
    { productCategoryId: { in: [...new Set(categoryIds)] } },
    'productCategoryId stockRouteId',
  );

  return groupBy(links, (link) => link.productCategoryId);
};

// Everything the values planner needs for each reordering rule. Rules whose
// chain of supply rules loops come back as a loop with the product's owner.
export const readOrderpointInputs = async (orderpointIds: string[]): Promise<OrderpointContext[]> => {
  const settings = readStockSettings();
  const digits = settings.productUnitDigits;
  const horizonDays = settings.replenishmentHorizonDays;
  const today = todayUtc();
  const now = new Date();
  const rows = (await stockWarehouseOrderpoints.find<OrderpointRow>({ id: { in: orderpointIds } }, ORDERPOINT_VALUE_SELECTION)).filter(
    (row): row is Located => row.productId !== null && row.locationId !== null,
  );

  if (rows.length === 0) {
    return [];
  }
  const found = await readOrderpointRules(
    rows.map((row) => ({ orderpointId: row.id, productId: row.productId, locationId: row.locationId, routeId: row.routeId })),
  );
  const routingProducts = [...found.values()].map((entry) => entry.product);
  const [owners, units, candidates, categoryLinks, warehouseScopeIds] = await Promise.all([
    readProductOwners([...new Set(rows.map((row) => row.productId))]),
    readResolvedUoms(),
    readRouteRuleCandidates([...new Set(rows.map((row) => row.locationId))]),
    readCategoryRouteIds(routingProducts.flatMap((product) => (product.categoryId === null ? [] : [product.categoryId]))),
    readScopeLocationIds(),
  ]);
  const contexts: OrderpointContext[] = [];

  for (const [locationId, located] of groupBy(rows, (row) => row.locationId)) {
    const stock = await readLocationStock({ productIds: [...new Set(located.map((row) => row.productId))], locationId });
    // Rules of one location often share a horizon day: each day is planned once.
    const byDay = new Map<string | null, ReturnType<typeof quantitiesUpTo>>();
    const quantitiesAt = (toDay: string | null) => {
      const known = byDay.get(toDay);

      if (known !== undefined) {
        return known;
      }
      const planned = quantitiesUpTo(stock, { toDay, digits, now });

      byDay.set(toDay, planned);
      return planned;
    };

    for (const row of located) {
      const routing = found.get(row.id);
      const owner = owners.get(row.productId);

      if (routing === undefined || owner === undefined) {
        continue;
      }
      if (routing.kind === 'loop') {
        contexts.push({ kind: 'loop', row, owner, error: routing.error });
        continue;
      }
      const product = routing.product;
      const productUom = units.get(product.uomId);

      if (productUom === undefined) {
        continue;
      }
      const leadTimes = orderpointLeadTimes({ today, rules: routing.rules, horizonDays });
      const atHorizon = quantitiesAt(leadTimes.leadHorizonDate).get(product.id);
      const withoutEnd = quantitiesAt(null).get(product.id);

      contexts.push({
        kind: 'input',
        row,
        input: {
          today,
          horizonDays,
          digits,
          orderpoint: {
            trigger: row.trigger,
            productMinQty: row.productMinQty,
            productMaxQty: row.productMaxQty,
            qtyToOrderManual: row.qtyToOrderManual ?? 0,
            routeId: row.routeId,
            locationId,
          },
          leadTimes,
          hasRules: routing.rules.length > 0,
          qtyOnHand: withoutEnd?.qtyAvailable ?? 0,
          // Orders sent but not yet in the forecast count only once purchasing exists; none here.
          qtyForecast: atHorizon?.virtualAvailable ?? 0,
          qtyForecastNoEnd: withoutEnd?.virtualAvailable ?? 0,
          productUom,
          replenishmentUom: row.replenishmentUomId === null ? null : (units.get(row.replenishmentUomId) ?? null),
          deadlineMoves: stock.moves.flatMap((move) =>
            move.productId === product.id
              ? [
                  {
                    locationId: move.locationId,
                    locationDestId: move.locationDestId,
                    locationFinalId: move.locationFinalId,
                    date: move.date,
                    productQty: move.productQty ?? 0,
                  },
                ]
              : [],
          ),
          warehouseScopeIds,
          defaultRouteId: defaultOrderpointRoute({
            locationId,
            productRouteIds: product.routeIds,
            categoryRouteIds:
              product.categoryId === null ? [] : (categoryLinks.get(product.categoryId) ?? []).map((link) => link.stockRouteId),
            rules: candidates,
          }),
        },
      });
    }
  }

  return contexts;
};
