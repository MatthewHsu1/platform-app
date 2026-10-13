import { describe, expect, it } from 'vitest';

import { type RouteRuleCandidate } from 'src/stock/orderpoint/types/route-rule-candidate.type';
import { defaultOrderpointRoute } from 'src/stock/orderpoint/utils/default-orderpoint-route.util';

const rule = (values: Partial<RouteRuleCandidate>): RouteRuleCandidate => ({
  routeId: 'reception',
  routeSequence: 50,
  routeCreatedAt: '2026-01-01T00:00:00.000Z',
  routeActive: true,
  productSelectable: false,
  productCategSelectable: true,
  locationDestId: 'stock',
  action: 'PULL',
  ...values,
});

describe('defaultOrderpointRoute', () => {
  it('picks a product route with a pull rule into this exact location', () => {
    expect(defaultOrderpointRoute({ locationId: 'stock', productRouteIds: ['reception'], categoryRouteIds: [], rules: [rule({})] })).toBe('reception');
  });

  it('accepts an own category route and a pull-and-push rule', () => {
    expect(defaultOrderpointRoute({ locationId: 'stock', productRouteIds: [], categoryRouteIds: ['reception'], rules: [rule({})] })).toBe('reception');
    expect(
      defaultOrderpointRoute({ locationId: 'stock', productRouteIds: ['reception'], categoryRouteIds: [], rules: [rule({ action: 'PULL_PUSH' })] }),
    ).toBe('reception');
  });

  it('skips push rules, other locations, archived and unselectable routes, and routes the product does not list', () => {
    const routes = { productRouteIds: ['reception'], categoryRouteIds: [] };
    expect(defaultOrderpointRoute({ locationId: 'stock', ...routes, rules: [rule({ action: 'PUSH' })] })).toBeNull();
    expect(defaultOrderpointRoute({ locationId: 'stock', ...routes, rules: [rule({ locationDestId: 'view' })] })).toBeNull();
    expect(defaultOrderpointRoute({ locationId: 'stock', ...routes, rules: [rule({ routeActive: false })] })).toBeNull();
    expect(defaultOrderpointRoute({ locationId: 'stock', ...routes, rules: [rule({ productCategSelectable: false })] })).toBeNull();
    expect(defaultOrderpointRoute({ locationId: 'stock', productRouteIds: [], categoryRouteIds: [], rules: [rule({})] })).toBeNull();
  });

  it('takes the route with the lowest sequence first', () => {
    const rules = [rule({ routeId: 'late', routeSequence: 60 }), rule({ routeId: 'early', routeSequence: 5 })];
    expect(defaultOrderpointRoute({ locationId: 'stock', productRouteIds: ['late', 'early'], categoryRouteIds: [], rules })).toBe('early');
  });

  it('takes the older route when two share the lowest sequence', () => {
    const rules = [
      rule({ routeId: 'newer', routeSequence: 5, routeCreatedAt: '2026-03-01T00:00:00.000Z' }),
      rule({ routeId: 'older', routeSequence: 5, routeCreatedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(defaultOrderpointRoute({ locationId: 'stock', productRouteIds: ['newer', 'older'], categoryRouteIds: [], rules })).toBe('older');
  });
});
