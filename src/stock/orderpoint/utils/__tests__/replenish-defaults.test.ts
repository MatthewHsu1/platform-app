import { describe, expect, it } from 'vitest';

import {
  allowedReplenishRouteIds,
  defaultReplenishRouteId,
  firstVariantId,
  isOfferedReplenishChoice,
  offeredReplenishRoutes,
  replenishDatePlanned,
  replenishQuantity,
} from 'src/stock/orderpoint/utils/replenish-defaults.util';
import { type ReplenishRoute } from 'src/stock/orderpoint/types/replenish-route.type';

const route = (values: Partial<ReplenishRoute>): ReplenishRoute => ({
  id: 'r',
  name: 'Route',
  sequence: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  active: true,
  productSelectable: true,
  rules: [{ delay: 0, destinationInWarehouse: true }],
  ...values,
});

describe('replenishDatePlanned', () => {
  it('is now for a route without delay and now plus every rule delay of the route, push rules included', () => {
    const now = '2023-01-01T00:00:00.000Z';

    expect(replenishDatePlanned({ now, route: route({ rules: [{ delay: 0, destinationInWarehouse: true }] }) })).toBe(
      '2023-01-01T00:00:00.000Z',
    );
    expect(
      replenishDatePlanned({
        now,
        route: route({
          rules: [
            { delay: 2, destinationInWarehouse: true },
            { delay: 4, destinationInWarehouse: true },
          ],
        }),
      }),
    ).toBe('2023-01-07T00:00:00.000Z');
  });

  it('is now without a route', () => {
    expect(replenishDatePlanned({ now: '2023-01-01T00:00:00.000Z', route: null })).toBe('2023-01-01T00:00:00.000Z');
  });
});

describe('replenishQuantity', () => {
  it('is 1 for a product that is not short, such as a brand new product', () => {
    expect(replenishQuantity(0)).toBe(1);
    expect(replenishQuantity(12)).toBe(1);
  });

  it('is the shortage when the forecast is negative', () => {
    expect(replenishQuantity(-7)).toBe(7);
  });
});

describe('allowedReplenishRouteIds', () => {
  it('offers the product-selectable routes whose rules all end in a warehouse, in route order', () => {
    const routes = [
      route({ id: 'late', sequence: 20 }),
      route({ id: 'early', sequence: 5 }),
      route({ id: 'leaves', rules: [{ delay: 0, destinationInWarehouse: false }] }),
      route({ id: 'unselectable', productSelectable: false }),
      route({ id: 'archived', active: false }),
    ];

    expect(allowedReplenishRouteIds({ routes, extraRouteIds: [] })).toEqual(['early', 'late']);
  });

  it('offers a route that passes through transit before one of its rules brings the goods into a warehouse', () => {
    const routes = [
      route({
        id: 'resupply',
        rules: [
          { delay: 0, destinationInWarehouse: false },
          { delay: 1, destinationInWarehouse: true },
        ],
      }),
      route({ id: 'empty', rules: [] }),
    ];

    expect(allowedReplenishRouteIds({ routes, extraRouteIds: [] })).toEqual(['resupply']);
  });

  it("adds the routes of the product's category, even when they are not product-selectable", () => {
    const routes = [
      route({ id: 'late', sequence: 20 }),
      route({ id: 'category', sequence: 15, productSelectable: false }),
      route({ id: 'early', sequence: 5 }),
    ];

    expect(allowedReplenishRouteIds({ routes, extraRouteIds: ['category'] })).toEqual(['early', 'category', 'late']);
  });

  it('breaks a sequence tie by the older route', () => {
    const routes = [
      route({ id: 'newer', createdAt: '2026-02-01T00:00:00.000Z' }),
      route({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }),
    ];

    expect(allowedReplenishRouteIds({ routes, extraRouteIds: [] })).toEqual(['older', 'newer']);
  });
});

describe('defaultReplenishRouteId', () => {
  const routes = [
    route({ id: 'first', sequence: 1 }),
    route({ id: 'listed', sequence: 5 }),
    route({ id: 'leaves', sequence: 2, rules: [{ delay: 0, destinationInWarehouse: false }] }),
  ];

  it('a product with routes takes the first allowed route that lists it', () => {
    expect(defaultReplenishRouteId({ templateRouteIds: ['listed'], routes })).toBe('listed');
  });

  it("a product whose routes are none of the allowed ones takes the product's first route", () => {
    expect(defaultReplenishRouteId({ templateRouteIds: ['leaves'], routes })).toBe('leaves');
  });

  it('a product without routes takes the first allowed route', () => {
    expect(defaultReplenishRouteId({ templateRouteIds: [], routes })).toBe('first');
  });

  it('no route at all leaves the route empty', () => {
    expect(defaultReplenishRouteId({ templateRouteIds: [], routes: [] })).toBeNull();
  });
});

describe('firstVariantId', () => {
  it('takes the variant first by internal reference, then name, then age', () => {
    const variants = [
      { id: 'no-code', defaultCode: null, name: 'Desk (Black)', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', defaultCode: 'DESK-B', name: 'Desk (White)', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'a', defaultCode: 'DESK-A', name: 'Desk (Oak)', createdAt: '2026-01-02T00:00:00.000Z' },
    ];

    expect(firstVariantId(variants)).toBe('a');
    expect(firstVariantId(variants.filter((variant) => variant.defaultCode === null))).toBe('no-code');
    expect(firstVariantId([])).toBeNull();
  });

  it('counts an empty internal reference as none', () => {
    expect(
      firstVariantId([
        { id: 'empty', defaultCode: '', name: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'coded', defaultCode: 'X', name: 'B', createdAt: '2026-01-01T00:00:00.000Z' },
      ]),
    ).toBe('coded');
  });
});

describe('offeredReplenishRoutes and isOfferedReplenishChoice', () => {
  const routes = [route({ id: 'orderable', sequence: 1 }), route({ id: 'own', sequence: 5, productSelectable: false })];
  const offered = (routeIds: string[]) => ({ variantId: 'desk', warehouseId: 'wh', unitIds: ['unit', 'dozen'], routeIds });
  const chosen = (routeId: string | null) => ({ variantId: 'desk', warehouseId: 'wh', uomId: 'dozen', routeId });

  it("offers the product's own route as its default even when no rule would allow it, and Confirm accepts it", () => {
    const { defaultRouteId, routeIds } = offeredReplenishRoutes({ routes, categoryRouteIds: [], templateRouteIds: ['own'] });

    expect(defaultRouteId).toBe('own');
    expect(routeIds).toEqual(['orderable', 'own']);
    expect(isOfferedReplenishChoice(offered(routeIds), chosen('own'))).toBe(true);
  });

  it('refuses a route, unit, warehouse or variant the pop-up did not offer, and accepts no route', () => {
    const { routeIds } = offeredReplenishRoutes({ routes, categoryRouteIds: [], templateRouteIds: [] });

    expect(routeIds).toEqual(['orderable']);
    expect(isOfferedReplenishChoice(offered(routeIds), chosen('own'))).toBe(false);
    expect(isOfferedReplenishChoice(offered(routeIds), { ...chosen(null), uomId: 'pallet' })).toBe(false);
    expect(isOfferedReplenishChoice(offered(routeIds), { ...chosen(null), warehouseId: 'other' })).toBe(false);
    expect(isOfferedReplenishChoice(offered(routeIds), { ...chosen(null), variantId: 'chair' })).toBe(false);
    expect(isOfferedReplenishChoice(offered(routeIds), chosen(null))).toBe(true);
  });
});
