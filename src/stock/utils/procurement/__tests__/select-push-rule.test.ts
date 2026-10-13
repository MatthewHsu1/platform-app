import { describe, expect, it } from 'vitest';

import {
  locations,
  product,
  route,
  routingData,
  rule,
  warehouseWorld,
} from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { selectPushRule } from 'src/stock/utils/procurement/select-push-rule.util';

describe('selectPushRule', () => {
  it('finds the Output → Customers push rule of a two-step delivery through the warehouse routes', () => {
    const world = warehouseWorld({ delivery: 'PICK_SHIP' });
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPushRule({ product: product(), locationDestId: 'output', values: { warehouseId: 'WH' } }, data)?.id).toBe('ship');
  });

  it('walks up from a sub-location of the destination', () => {
    const world = warehouseWorld({ reception: 'TWO_STEPS' });
    const locationMap = locations({
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
      input: { name: 'Input', parentId: 'wh' },
      dock: { name: 'Dock', parentId: 'input' },
      stock: { name: 'Stock', parentId: 'wh' },
    });
    const data = routingData({ locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPushRule({ product: product(), locationDestId: 'dock', values: { warehouseId: 'WH' } }, data)?.id).toBe('store');
  });

  it('uses a route forced on the move', () => {
    const world = warehouseWorld();
    const pushRoute = route('new-route');
    const locationMap = locations({
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
      stock: { name: 'Stock', parentId: 'wh' },
      pushed: { name: 'push location', parentId: 'wh' },
    });
    const routes = [...world.routes, pushRoute];
    const data = routingData({
      locationMap,
      routes,
      rules: [...world.rules, rule('to-push-location', { routeId: 'new-route', action: 'PUSH', locationSrcId: 'stock', locationDestId: 'pushed', pickingTypeId: 'IN' }, routes)],
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(
      selectPushRule({ product: product(), locationDestId: 'stock', values: { routeIds: ['new-route'], warehouseId: 'WH' } }, data)?.id,
    ).toBe('to-push-location');
  });

  it('skips excluded rules and takes the next one', () => {
    const world = warehouseWorld({ delivery: 'PICK_SHIP' });
    const other = route('other', { sequence: 70 });
    const routes = [...world.routes, other];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [...world.rules, rule('other-ship', { routeId: 'other', action: 'PULL_PUSH', locationSrcId: 'output', locationDestId: 'customers', pickingTypeId: 'OUT' }, routes)],
      warehouseRouteIds: { WH: ['reception', 'delivery', 'other'] },
    });

    expect(
      selectPushRule({ product: product(), locationDestId: 'output', values: { warehouseId: 'WH' }, excludedRuleIds: ['ship'] }, data)?.id,
    ).toBe('other-ship');
  });

  it('never picks a pull rule', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(selectPushRule({ product: product(), locationDestId: 'stock', values: { warehouseId: 'WH' } }, data)).toBeNull();
  });

  it("ignores another warehouse's push rule even when its route comes first", () => {
    const world = warehouseWorld({ delivery: 'PICK_SHIP' });
    const early = route('early', { sequence: 1 });
    const routes = [...world.routes, early];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [...world.rules, rule('wh2-ship', { routeId: 'early', action: 'PUSH', locationSrcId: 'output', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH2' }, routes)],
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(selectPushRule({ product: product({ routeIds: ['early'] }), locationDestId: 'output', values: { warehouseId: 'WH' } }, data)?.id).toBe('ship');
  });

  it("tries the packaging's package type routes before the product routes", () => {
    const world = warehouseWorld();
    const pallet = route('pallet-route', { sequence: 90 });
    const own = route('own', { sequence: 1 });
    const routes = [...world.routes, pallet, own];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('pallet-push', { routeId: 'pallet-route', action: 'PUSH', locationSrcId: 'input', locationDestId: 'stock', pickingTypeId: 'STOR' }, routes),
        rule('own-push', { routeId: 'own', action: 'PUSH', locationSrcId: 'input', locationDestId: 'qc', pickingTypeId: 'QC' }, routes),
      ],
      packageTypeRouteIds: { pallet: ['pallet-route'] },
      unitPackageTypeIds: { 'pallet-unit': 'pallet' },
    });

    expect(
      selectPushRule({ product: product({ routeIds: ['own'] }), locationDestId: 'input', values: { packagingUomId: 'pallet-unit' } }, data)?.id,
    ).toBe('pallet-push');
  });

  it("tries the product category's routes", () => {
    const world = warehouseWorld();
    const categoryRoute = route('category-route');
    const routes = [...world.routes, categoryRoute];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [...world.rules, rule('category-push', { routeId: 'category-route', action: 'PUSH', locationSrcId: 'input', locationDestId: 'stock', pickingTypeId: 'STOR' }, routes)],
      categoryTotalRouteIds: { belts: ['category-route'] },
    });

    expect(selectPushRule({ product: product({ categoryId: 'belts' }), locationDestId: 'input', values: {} }, data)?.id).toBe('category-push');
  });
});
