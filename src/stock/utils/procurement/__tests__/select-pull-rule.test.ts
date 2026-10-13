import { describe, expect, it } from 'vitest';

import {
  locations,
  product,
  route,
  routingData,
  rule,
  warehouseWorld,
} from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { selectPullRule } from 'src/stock/utils/procurement/select-pull-rule.util';

describe('selectPullRule', () => {
  it('uses the warehouse routes when nothing else applies (delivery to Customers)', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPullRule({ product: product(), locationId: 'customers', values: { warehouseId: 'WH' } }, data)?.id).toBe('out');
  });

  it('never picks a push rule: in two steps the pull rule Stock → Customers serves Customers', () => {
    const world = warehouseWorld({ delivery: 'PICK_SHIP' });
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPullRule({ product: product(), locationId: 'customers', values: { warehouseId: 'WH' } }, data)?.id).toBe('pick');
  });

  it('walks up the location chain: a shelf of Stock is served by the rule into Stock', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPullRule({ product: product(), locationId: 'shelf1', values: {} }, data)?.id).toBe('in');
  });

  it('finds nothing where no rule leads', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPullRule({ product: product(), locationId: 'vendors', values: {} }, data)).toBeNull();
  });

  it('uses a product route before the warehouse routes (Stock → Output for a need in Output)', () => {
    const world = warehouseWorld();
    const productRoute = route('stock-to-output');
    const routes = [...world.routes, productRoute];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('stock-to-output-rule', { routeId: 'stock-to-output', locationSrcId: 'stock', locationDestId: 'output', locationDestFromRule: true, pickingTypeId: 'INT' }, routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(
      selectPullRule({ product: product({ routeIds: ['stock-to-output'] }), locationId: 'output', values: { warehouseId: 'WH' } }, data)?.id,
    ).toBe('stock-to-output-rule');
  });

  it('takes the route with the lowest sequence among the product routes', () => {
    const world = warehouseWorld();
    const low = route('route-1', { sequence: 10 });
    const high = route('route-2', { sequence: 5 });
    const routes = [...world.routes, low, high];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('rule-route-1', { routeId: 'route-1', locationSrcId: 'stock', locationDestId: 'stock', pickingTypeId: 'OUT', sequence: 20 }, routes),
        rule('rule-route-2', { routeId: 'route-2', locationSrcId: 'stock', locationDestId: 'stock', pickingTypeId: 'OUT', sequence: 20 }, routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
    });
    const desk = product({ routeIds: ['route-1', 'route-2'] });

    expect(selectPullRule({ product: desk, locationId: 'stock', values: { warehouseId: 'WH', routeIds: desk.routeIds } }, data)?.id).toBe(
      'rule-route-2',
    );
  });

  it('puts the procurement routes before the product routes, whatever their sequence', () => {
    const world = warehouseWorld();
    const forced = route('forced', { sequence: 90 });
    const own = route('own', { sequence: 1 });
    const routes = [...world.routes, forced, own];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('forced-rule', { routeId: 'forced', locationSrcId: 'input', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
        rule('own-rule', { routeId: 'own', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(
      selectPullRule({ product: product({ routeIds: ['own'] }), locationId: 'customers', values: { warehouseId: 'WH', routeIds: ['forced'] } }, data)?.id,
    ).toBe('forced-rule');
  });

  it("puts the packaging's package type routes before the product routes", () => {
    const world = warehouseWorld();
    const pallet = route('pallet-route', { sequence: 90 });
    const own = route('own', { sequence: 1 });
    const routes = [...world.routes, pallet, own];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('pallet-rule', { routeId: 'pallet-route', locationSrcId: 'input', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
        rule('own-rule', { routeId: 'own', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
      packageTypeRouteIds: { pallet: ['pallet-route'] },
      unitPackageTypeIds: { 'pallet-unit': 'pallet' },
    });

    expect(
      selectPullRule(
        { product: product({ routeIds: ['own'] }), locationId: 'customers', values: { warehouseId: 'WH', packagingUomId: 'pallet-unit' } },
        data,
      )?.id,
    ).toBe('pallet-rule');
  });

  it("puts the product's own routes before its category routes, even when the category route sorts first", () => {
    const world = warehouseWorld();
    const categoryRoute = route('category-route', { sequence: 1 });
    const own = route('own', { sequence: 40 });
    const routes = [...world.routes, categoryRoute, own];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('category-rule', { routeId: 'category-route', locationSrcId: 'input', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
        rule('own-rule', { routeId: 'own', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
      categoryTotalRouteIds: { belts: ['category-route'] },
    });

    expect(
      selectPullRule({ product: product({ routeIds: ['own'], categoryId: 'belts' }), locationId: 'customers', values: { warehouseId: 'WH' } }, data)?.id,
    ).toBe('own-rule');
  });

  it("takes the warehouse's own rule in a route, else the rule with no warehouse", () => {
    const locationMap = locations({
      customers: { name: 'Customers', usage: 'CUSTOMER' },
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
      stock: { name: 'Stock', parentId: 'wh' },
      wh2: { name: 'WH2', usage: 'VIEW', warehouseId: 'WH2' },
      stock2: { name: 'Stock', parentId: 'wh2' },
    });
    const shared = route('shared');
    const data = routingData({
      locationMap,
      routes: [shared],
      rules: [
        rule('any-warehouse', { routeId: 'shared', locationSrcId: 'stock2', locationDestId: 'customers', pickingTypeId: 'OUT' }, [shared]),
        rule('wh-only', { routeId: 'shared', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH' }, [shared]),
      ],
    });
    const desk = product({ routeIds: ['shared'] });

    expect(selectPullRule({ product: desk, locationId: 'customers', values: { warehouseId: 'WH' } }, data)?.id).toBe('wh-only');
    expect(selectPullRule({ product: desk, locationId: 'customers', values: { warehouseId: 'WH2' } }, data)?.id).toBe('any-warehouse');
  });

  it('ignores routes that are archived', () => {
    const world = warehouseWorld();
    const data = routingData({
      locationMap: world.locationMap,
      routes: world.routes.filter((row) => row.id !== 'delivery'),
      rules: world.rules,
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(selectPullRule({ product: product(), locationId: 'customers', values: { warehouseId: 'WH' } }, data)).toBeNull();
  });

  it('skips a route whose only rule at the location belongs to another warehouse and tries the next route', () => {
    const locationMap = locations({
      wh2: { name: 'WH2', usage: 'VIEW', warehouseId: 'WH2' },
      area: { name: 'Area', parentId: 'wh2' },
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH', parentId: 'area' },
      stock: { name: 'Stock', parentId: 'wh' },
    });
    const first = route('first', { sequence: 1 });
    const second = route('second', { sequence: 2 });
    const routes = [first, second];
    const data = routingData({
      locationMap,
      routes,
      rules: [
        rule('other-warehouse', { routeId: 'first', locationSrcId: 'area', locationDestId: 'stock', pickingTypeId: 'INT', warehouseId: 'WH2' }, routes),
        rule('no-warehouse', { routeId: 'second', locationSrcId: 'area', locationDestId: 'stock', pickingTypeId: 'INT' }, routes),
      ],
    });

    expect(selectPullRule({ product: product({ routeIds: ['first', 'second'] }), locationId: 'stock', values: {} }, data)?.id).toBe('no-warehouse');
  });

  it('breaks a tie on route and rule sequence by the earlier created rule, then by id', () => {
    const shared = route('shared');
    const locationMap = locations({ customers: { name: 'Customers', usage: 'CUSTOMER' }, stock: { name: 'Stock' } });
    const values = { routeId: 'shared', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT' };
    const desk = product({ routeIds: ['shared'] });
    const byCreation = routingData({
      locationMap,
      routes: [shared],
      rules: [
        rule('rule-a', { ...values, createdAt: '2026-10-08T10:00:00.000Z' }, [shared]),
        rule('rule-b', { ...values, createdAt: '2026-10-08T09:00:00.000Z' }, [shared]),
      ],
    });
    const byId = routingData({
      locationMap,
      routes: [shared],
      rules: [
        rule('rule-b', { ...values, createdAt: '2026-10-08T09:00:00.000Z' }, [shared]),
        rule('rule-a', { ...values, createdAt: '2026-10-08T09:00:00.000Z' }, [shared]),
      ],
    });

    expect(selectPullRule({ product: desk, locationId: 'customers', values: {} }, byCreation)?.id).toBe('rule-b');
    expect(selectPullRule({ product: desk, locationId: 'customers', values: {} }, byId)?.id).toBe('rule-a');
  });

  it("with the warehouse given as none, takes the route's first rule whatever its warehouse", () => {
    const shared = route('shared');
    const locationMap = locations({
      customers: { name: 'Customers', usage: 'CUSTOMER' },
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
      stock: { name: 'Stock', parentId: 'wh' },
    });
    const data = routingData({
      locationMap,
      routes: [shared],
      rules: [
        rule('no-warehouse', { routeId: 'shared', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT', sequence: 20 }, [shared]),
        rule('wh-rule', { routeId: 'shared', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH', sequence: 10 }, [shared]),
      ],
    });

    expect(selectPullRule({ product: product({ routeIds: ['shared'] }), locationId: 'customers', values: { warehouseId: null } }, data)?.id).toBe(
      'wh-rule',
    );
  });

  it('with the warehouse given as none, never looks at warehouse routes', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPullRule({ product: product(), locationId: 'customers', values: { warehouseId: null } }, data)).toBeNull();
  });
});
