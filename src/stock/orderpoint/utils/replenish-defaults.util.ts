import { type ReplenishRoute } from 'src/stock/orderpoint/types/replenish-route.type';

const DAY_MS = 24 * 60 * 60 * 1000;

const byRouteOrder = (left: ReplenishRoute, right: ReplenishRoute) =>
  left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt);

// A person may order through a product-selectable route when one of its rules
// brings the goods into a warehouse: an inter-warehouse resupply passes through
// transit on the way. A route without rules brings nothing anywhere.
const isOrderable = (route: ReplenishRoute) =>
  route.active && route.productSelectable && route.rules.some((rule) => rule.destinationInWarehouse);

// The routes the pop-up offers, in route order: the orderable ones and the
// extra ones whatever their settings (the routes of the product's category).
export const allowedReplenishRouteIds = ({
  routes,
  extraRouteIds,
}: {
  routes: ReplenishRoute[];
  extraRouteIds: string[];
}) =>
  routes
    .filter((route) => route.active && (isOrderable(route) || extraRouteIds.includes(route.id)))
    .sort(byRouteOrder)
    .map((route) => route.id);

// The first orderable route that lists the product; for a product without
// routes, the first orderable route. A product whose routes are none of the
// orderable ones keeps its own first route.
export const defaultReplenishRouteId = ({
  templateRouteIds,
  routes,
}: {
  templateRouteIds: string[];
  routes: ReplenishRoute[];
}): string | null => {
  const sorted = [...routes].sort(byRouteOrder);
  const orderable = sorted.filter(
    (route) => isOrderable(route) && (templateRouteIds.length === 0 || templateRouteIds.includes(route.id)),
  );

  return orderable[0]?.id ?? sorted.find((route) => route.active && templateRouteIds.includes(route.id))?.id ?? null;
};

export const replenishDatePlanned = ({ now, route }: { now: string; route: ReplenishRoute | null }) => {
  const delayDays = route === null ? 0 : route.rules.reduce((sum, rule) => sum + rule.delay, 0);

  return new Date(Date.parse(now) + delayDays * DAY_MS).toISOString();
};

export const replenishQuantity = (forecast: number) => (forecast < 0 ? -forecast : 1);

// The variant a product stands for: first by internal reference (none last),
// then name, then age.
export const firstVariantId = (
  variants: { id: string; defaultCode: string | null; name: string; createdAt: string }[],
) => {
  const code = (value: string | null) => (value === null || value === '' ? null : value);
  const [first] = [...variants].sort((left, right) => {
    const leftCode = code(left.defaultCode);
    const rightCode = code(right.defaultCode);

    if (leftCode !== rightCode) {
      return leftCode === null ? 1 : rightCode === null ? -1 : leftCode.localeCompare(rightCode);
    }

    return left.name.localeCompare(right.name) || left.createdAt.localeCompare(right.createdAt);
  });

  return first?.id ?? null;
};

// The routes offered and the default one. The default may be the product's own
// route that no rule would allow: it is offered too, so the pop-up can show
// and keep it.
export const offeredReplenishRoutes = ({
  routes,
  categoryRouteIds,
  templateRouteIds,
}: {
  routes: ReplenishRoute[];
  categoryRouteIds: string[];
  templateRouteIds: string[];
}) => {
  const defaultRouteId = defaultReplenishRouteId({ templateRouteIds, routes });

  return {
    defaultRouteId,
    routeIds: allowedReplenishRouteIds({
      routes,
      extraRouteIds: [...categoryRouteIds, ...(defaultRouteId === null ? [] : [defaultRouteId])],
    }),
  };
};

// Confirm takes only what the pop-up offers: the variant and warehouse it
// read, one of its units, and one of its routes or none.
export const isOfferedReplenishChoice = (
  offered: { variantId: string | null; warehouseId: string | null; unitIds: string[]; routeIds: string[] },
  chosen: { variantId: string | null; warehouseId: string | null; uomId: string | null; routeId: string | null },
) =>
  chosen.variantId !== null &&
  chosen.variantId === offered.variantId &&
  chosen.warehouseId !== null &&
  chosen.warehouseId === offered.warehouseId &&
  chosen.uomId !== null &&
  offered.unitIds.includes(chosen.uomId) &&
  (chosen.routeId === null || offered.routeIds.includes(chosen.routeId));
