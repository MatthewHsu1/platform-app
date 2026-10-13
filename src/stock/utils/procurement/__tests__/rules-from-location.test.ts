import { describe, expect, it } from 'vitest';

import { product, route, routingData, rule, warehouseWorld } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { rulesFromLocation } from 'src/stock/utils/procurement/rules-from-location.util';

describe('rulesFromLocation', () => {
  it('stops at the first take-from-stock rule', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });

    expect(rulesFromLocation({ product: product(), locationId: 'stock' }, data).map((found) => found.id)).toEqual(['in']);
  });

  it('follows trigger-another-rule rules from their source', () => {
    const world = warehouseWorld();
    const crossDock = route('cross-dock', { sequence: 1 });
    const routes = [...world.routes, crossDock];
    const data = routingData({
      locationMap: world.locationMap,
      routes,
      rules: [
        ...world.rules,
        rule('input-to-stock', { routeId: 'cross-dock', locationSrcId: 'input', locationDestId: 'stock', pickingTypeId: 'STOR', procureMethod: 'MAKE_TO_ORDER' }, routes),
        rule('vendors-to-input', { routeId: 'cross-dock', locationSrcId: 'vendors', locationDestId: 'input', pickingTypeId: 'IN' }, routes),
      ],
      warehouseRouteIds: { WH: ['reception', 'delivery', 'cross-dock'] },
    });

    expect(rulesFromLocation({ product: product(), locationId: 'stock' }, data).map((found) => found.id)).toEqual([
      'input-to-stock',
      'vendors-to-input',
    ]);
  });

  it('refuses a rule that leads back to itself', () => {
    const world = warehouseWorld();
    const data = routingData({
      locationMap: world.locationMap,
      routes: world.routes,
      rules: [
        ...world.rules.filter((found) => found.routeId !== 'reception'),
        rule('Looping Rule', { routeId: 'reception', action: 'PULL_PUSH', locationSrcId: 'stock', locationDestId: 'stock', pickingTypeId: 'INT', procureMethod: 'MAKE_TO_ORDER' }, world.routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(() => rulesFromLocation({ product: product(), locationId: 'stock' }, data)).toThrow(
      "Invalid rule's configuration, the following rule causes an endless loop: Looping Rule",
    );
  });
});
