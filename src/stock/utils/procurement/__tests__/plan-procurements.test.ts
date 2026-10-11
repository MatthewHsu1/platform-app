import { describe, expect, it } from 'vitest';

import { planMoveProcurements, planProcurements } from 'src/stock/utils/procurement/plan-procurements.util';
import { withoutTakenStock } from 'src/stock/utils/procurement/without-taken-stock.util';
import {
  confirmingMove,
  procurement,
  procurementContext,
} from 'src/stock/utils/procurement/__tests__/procurement-fixture';
import { locations, product, route, routingData, rule, warehouseWorld } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

// A three-step delivery set up with pull rules only; packing and shipping take
// from stock, else trigger another rule.
const pullOnlyThreeStepDelivery = () => {
  const world = warehouseWorld();
  const delivery = route('delivery', { sequence: 60 });
  const routes = [world.routes[0], delivery];
  const rules: RoutingRule[] = [
    ...world.rules.filter((found) => found.routeId === 'reception'),
    rule('pick', { routeId: 'delivery', locationSrcId: 'stock', locationDestId: 'pack', pickingTypeId: 'PICK', warehouseId: 'WH' }, routes),
    rule('packing', { routeId: 'delivery', locationSrcId: 'pack', locationDestId: 'output', pickingTypeId: 'PACK', warehouseId: 'WH', procureMethod: 'MTS_ELSE_MTO' }, routes),
    rule('ship', { routeId: 'delivery', locationSrcId: 'output', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH', procureMethod: 'MTS_ELSE_MTO' }, routes),
  ];

  return routingData({ locationMap: world.locationMap, routes, rules, warehouseRouteIds: world.warehouseRouteIds });
};

describe('planProcurements', () => {
  it('takes 4 of 5 from Output and procures only the missing 1 upstream', () => {
    const data = pullOnlyThreeStepDelivery();
    const context = procurementContext({
      quants: [
        { productId: 'product', locationId: 'output', quantity: 4, reservedQuantity: 0 },
        { productId: 'product', locationId: 'stock', quantity: 4, reservedQuantity: 0 },
      ],
    });
    const result = planProcurements([procurement({ locationId: 'customers', productQty: 5, values: { warehouseId: 'WH' } })], data, context);

    expect(result.errors).toEqual([]);
    expect(result.moves.map((move) => [move.ruleId, move.productUomQty, move.procureMethod])).toEqual([
      ['ship', 5, 'MAKE_TO_STOCK'],
      ['packing', 1, 'MAKE_TO_STOCK'],
      ['pick', 1, 'MAKE_TO_STOCK'],
    ]);
    expect(result.moves.every((move) => move.moveDests.length === 0)).toBe(true);
  });

  it('counts stock once across procurements of one run: the third need of 2 goes upstream', () => {
    const data = pullOnlyThreeStepDelivery();
    const context = procurementContext({ quants: [{ productId: 'product', locationId: 'output', quantity: 4, reservedQuantity: 0 }] });
    const result = planProcurements(
      [1, 2, 3].map((index) => procurement({ locationId: 'customers', productQty: 2, origin: `need ${index}`, values: { warehouseId: 'WH' } })),
      data,
      context,
    );

    expect(result.moves.map((move) => [move.ruleId, move.productUomQty, move.origin])).toEqual([
      ['ship', 2, 'need 1'],
      ['ship', 2, 'need 2'],
      ['ship', 2, 'need 3'],
      ['packing', 2, 'need 3'],
      ['pick', 2, 'need 3'],
    ]);
  });

  it('pulls one move in a three-step delivery: its destination is left to the operation type, its final location is Customers', () => {
    const world = warehouseWorld({ delivery: 'PICK_PACK_SHIP' });
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
    const result = planProcurements([procurement({ locationId: 'customers', values: { warehouseId: 'WH' } })], data, procurementContext());

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]).toMatchObject({
      ruleId: 'pick',
      locationId: 'stock',
      locationDestId: null,
      locationFinalId: 'customers',
      pickingTypeId: 'PICK',
      warehouseId: 'WH',
    });
  });

  // Stock -> transit -> Dist. -> transit -> Shop -> Customer: five moves.
  it('plans the whole resupply chain behind a make-to-order delivery from the shop', () => {
    const locationMap = locations({
      customers: { name: 'Customers', usage: 'CUSTOMER' },
      vendors: { name: 'Vendors', usage: 'SUPPLIER' },
      transit: { name: 'Inter-warehouse transit', usage: 'TRANSIT' },
      stk: { name: 'STK', usage: 'VIEW', warehouseId: 'STK' },
      stkStock: { name: 'Stock', parentId: 'stk' },
      dist: { name: 'DIST', usage: 'VIEW', warehouseId: 'DIST' },
      distStock: { name: 'Stock', parentId: 'dist' },
      shop: { name: 'SHOP', usage: 'VIEW', warehouseId: 'SHOP' },
      shopStock: { name: 'Stock', parentId: 'shop' },
    });
    const stockToDist = route('stock-to-dist', { supplierWhId: 'STK' });
    const distToShop = route('dist-to-shop', { supplierWhId: 'DIST' });
    const receptions = ['STK', 'DIST', 'SHOP'].map((code) => route(`reception-${code}`, { sequence: 50 }));
    const routes = [stockToDist, distToShop, ...receptions];
    const rules = [
      rule('stk-to-transit', { routeId: 'stock-to-dist', locationSrcId: 'stkStock', locationDestId: 'transit', locationDestFromRule: true, pickingTypeId: 'OUT-STK', warehouseId: 'STK' }, routes),
      rule('transit-to-dist', { routeId: 'stock-to-dist', locationSrcId: 'transit', locationDestId: 'distStock', pickingTypeId: 'IN-DIST', warehouseId: 'DIST', procureMethod: 'MAKE_TO_ORDER' }, routes),
      rule('dist-to-transit', { routeId: 'dist-to-shop', locationSrcId: 'distStock', locationDestId: 'transit', locationDestFromRule: true, pickingTypeId: 'OUT-DIST', warehouseId: 'DIST', procureMethod: 'MAKE_TO_ORDER' }, routes),
      rule('transit-to-shop', { routeId: 'dist-to-shop', locationSrcId: 'transit', locationDestId: 'shopStock', pickingTypeId: 'IN-SHOP', warehouseId: 'SHOP', procureMethod: 'MAKE_TO_ORDER' }, routes),
      // Rules of the make-to-order route, which is archived: never used.
      rule('mto-stk', { routeId: 'mto', locationSrcId: 'stkStock', locationDestId: 'transit', pickingTypeId: 'OUT-STK', warehouseId: 'STK', procureMethod: 'MAKE_TO_ORDER' }, routes),
      rule('mto-dist', { routeId: 'mto', locationSrcId: 'distStock', locationDestId: 'transit', pickingTypeId: 'OUT-DIST', warehouseId: 'DIST', procureMethod: 'MAKE_TO_ORDER' }, routes),
      ...['STK', 'DIST', 'SHOP'].map((code) =>
        rule(`in-${code}`, { routeId: `reception-${code}`, locationSrcId: 'vendors', locationDestId: `${code.toLowerCase()}Stock`, pickingTypeId: `IN-${code}`, warehouseId: code }, routes),
      ),
    ];
    const data = routingData({
      locationMap,
      routes,
      rules,
      warehouseRouteIds: { STK: ['reception-STK'], DIST: ['reception-DIST'], SHOP: ['reception-SHOP'] },
    });
    const fakir = product({ name: 'Fakir', routeIds: ['stock-to-dist', 'dist-to-shop', 'mto'] });
    const context = procurementContext({
      productList: [fakir],
      internalTransitLocationId: 'transit',
      warehousePartnerIds: new Map([['DIST', 'distribution-center']]),
      pickingTypes: new Map([
        ['IN-SHOP', { warehouseId: 'SHOP', defaultLocationDestId: 'shopStock' }],
        ['IN-DIST', { warehouseId: 'DIST', defaultLocationDestId: 'distStock' }],
        ['OUT-DIST', { warehouseId: 'DIST', defaultLocationDestId: 'customers' }],
        ['OUT-STK', { warehouseId: 'STK', defaultLocationDestId: 'customers' }],
      ]),
      existingMoveDestinations: new Map([['shop-out', 'customers']]),
    });
    const delivery = confirmingMove({
      ref: { kind: 'existing', id: 'shop-out' },
      locationId: 'shopStock',
      locationDestId: 'customers',
      procureMethod: 'MAKE_TO_ORDER',
      warehouseId: 'SHOP',
      partner: { companyId: 'customer', personId: null },
    });
    const procurements = planMoveProcurements([delivery], data, context, new Map()).map((entry) => entry.procurement);
    const result = planProcurements(procurements, data, context);

    expect(result.errors).toEqual([]);
    expect(result.moves.map((move) => [move.ruleId, move.locationId, move.locationFinalId, move.procureMethod])).toEqual([
      ['transit-to-shop', 'transit', 'shopStock', 'MAKE_TO_ORDER'],
      ['dist-to-transit', 'distStock', 'transit', 'MAKE_TO_ORDER'],
      ['transit-to-dist', 'transit', 'distStock', 'MAKE_TO_ORDER'],
      ['stk-to-transit', 'stkStock', 'transit', 'MAKE_TO_STOCK'],
    ]);
    // Each new move feeds the one planned before it; the first feeds the delivery.
    expect(result.moves.map((move) => move.moveDests)).toEqual([
      [{ kind: 'existing', id: 'shop-out' }],
      [{ kind: 'planned', key: result.moves[0].key }],
      [{ kind: 'planned', key: result.moves[1].key }],
      [{ kind: 'planned', key: result.moves[2].key }],
    ]);
    // Transfers in and out of transit carry the distribution center as partner.
    expect(result.moves[0].companyId).toBe('distribution-center');
    expect(result.moves[3].companyId).toBe('distribution-center');
  });

  it('carries the reordering rule down a chain of take-from-stock-else-order rules', () => {
    const data = pullOnlyThreeStepDelivery();
    const result = planProcurements(
      [procurement({ locationId: 'customers', productQty: 3, values: { warehouseId: 'WH', orderpointId: 'op1' } })],
      data,
      procurementContext(),
    );

    expect(result.errors).toEqual([]);
    expect(result.moves.map((move) => [move.ruleId, move.orderpointId])).toEqual([
      ['ship', 'op1'],
      ['packing', 'op1'],
      ['pick', 'op1'],
    ]);
  });

  it('dates the move earlier by the rule lead time', () => {
    const world = warehouseWorld();
    const data = routingData({
      locationMap: world.locationMap,
      routes: world.routes,
      rules: world.rules.map((found) => (found.id === 'out' ? { ...found, delay: 2 } : found)),
      warehouseRouteIds: world.warehouseRouteIds,
    });
    const result = planProcurements(
      [
        procurement({
          locationId: 'customers',
          values: { warehouseId: 'WH', datePlanned: '2026-10-10T12:00:00.000Z', dateDeadline: '2026-10-12T00:00:00.000Z' },
        }),
      ],
      data,
      procurementContext(),
    );

    expect(result.moves[0]).toMatchObject({ date: '2026-10-08T12:00:00.000Z', dateDeadline: '2026-10-10T00:00:00.000Z' });
  });

  it('skips services and zero quantities without an error', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
    const context = procurementContext({ productList: [product(), product({ id: 'service', productType: 'SERVICE' })] });
    const result = planProcurements(
      [procurement({ locationId: 'customers', productId: 'service' }), procurement({ locationId: 'customers', productQty: 0.001 })],
      data,
      context,
    );

    expect(result).toEqual({ moves: [], partnerUpdates: [], errors: [] });
  });

  it('reports a location with no rule, and plans nothing', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
    const result = planProcurements([procurement({ locationId: 'vendors' })], data, procurementContext());

    expect(result.moves).toEqual([]);
    expect(result.errors).toEqual([
      {
        message: 'No rule has been found to replenish "{product}" in "{location}".\nVerify the routes configuration on the product.',
        values: { product: 'Desk Combination', location: 'Vendors' },
      },
    ]);
  });

  it('reports a product it could not read, and plans nothing', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
    const result = planProcurements([procurement({ locationId: 'customers', productId: 'gone', values: { warehouseId: 'WH' } })], data, procurementContext());

    expect(result).toEqual({ moves: [], partnerUpdates: [], errors: [{ message: 'Product {product} was not found.', values: { product: 'gone' } }] });
  });

  // A scrap of 3 from Shelf 1 refilled from Stock, which takes from stock, else orders.
  describe('when stock is taken before the plan runs', () => {
    const refillWorld = () => {
      const world = warehouseWorld();
      const refill = route('refill', { sequence: 10 });
      const routes = [...world.routes, refill];

      return routingData({
        locationMap: world.locationMap,
        routes,
        rules: [
          ...world.rules,
          rule('refill', { routeId: 'refill', locationSrcId: 'stock', locationDestId: 'shelf1', pickingTypeId: 'INT', warehouseId: 'WH', procureMethod: 'MTS_ELSE_MTO' }, routes),
        ],
        warehouseRouteIds: { WH: ['reception', 'delivery', 'refill'] },
      });
    };
    const shelf = [{ productId: 'product', locationId: 'shelf1', quantity: 4, reservedQuantity: 0 }];
    const scrapRefill = procurement({ locationId: 'shelf1', productQty: 3 });

    it('counts the scrapped units as gone: 1 of 4 is left, so 2 are ordered upstream', () => {
      const context = procurementContext({ quants: withoutTakenStock(shelf, [{ productId: 'product', locationId: 'shelf1', quantity: 3 }]) });

      expect(planProcurements([scrapRefill], refillWorld(), context).moves.map((move) => [move.ruleId, move.productUomQty])).toEqual([
        ['refill', 3],
        ['in', 2],
      ]);
    });

    it('never counts less than nothing free', () => {
      const context = procurementContext({ quants: withoutTakenStock(shelf, [{ productId: 'product', locationId: 'shelf1', quantity: 6 }]) });

      expect(planProcurements([scrapRefill], refillWorld(), context).moves.map((move) => [move.ruleId, move.productUomQty])).toEqual([
        ['refill', 3],
        ['in', 3],
      ]);
    });
  });

  it('reports a rule with no source location', () => {
    const world = warehouseWorld();
    const data = routingData({
      locationMap: world.locationMap,
      routes: world.routes,
      rules: world.rules.map((found) => (found.id === 'out' ? { ...found, locationSrcId: null } : found)),
      warehouseRouteIds: world.warehouseRouteIds,
    });

    expect(planProcurements([procurement({ locationId: 'customers', values: { warehouseId: 'WH' } })], data, procurementContext()).errors).toEqual([
      { message: 'No source location defined on stock rule: {rule}!', values: { rule: 'out' } },
    ]);
  });

  it('refuses a chain that comes back to a rule it already used', () => {
    const world = warehouseWorld();
    const data = routingData({
      locationMap: world.locationMap,
      routes: world.routes,
      rules: [
        ...world.rules.filter((found) => found.routeId !== 'reception'),
        rule('loop', { routeId: 'reception', locationSrcId: 'stock', locationDestId: 'stock', pickingTypeId: 'INT', procureMethod: 'MAKE_TO_ORDER', warehouseId: 'WH' }, world.routes),
      ],
      warehouseRouteIds: world.warehouseRouteIds,
    });
    const result = planProcurements([procurement({ locationId: 'stock', values: { warehouseId: 'WH' } })], data, procurementContext());

    expect(result.errors).toEqual([
      { message: "Invalid rule's configuration, the following rule causes an endless loop: {rule}", values: { rule: 'loop' } },
    ]);
  });

  it('plans negative quantities first and marks them as refunds', () => {
    const world = warehouseWorld();
    const data = routingData({ locationMap: world.locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
    const result = planProcurements(
      [
        procurement({ locationId: 'customers', productQty: 3, values: { warehouseId: 'WH' } }),
        procurement({ locationId: 'customers', productQty: -2, values: { warehouseId: 'WH' } }),
      ],
      data,
      procurementContext(),
    );

    expect(result.moves.map((move) => [move.productUomQty, move.toRefund])).toEqual([
      [-2, true],
      [3, false],
    ]);
  });
});

describe('planMoveProcurements', () => {
  it('takes the transfer name when the move has no origin, and "/" when its rule has no name', () => {
    const move = confirmingMove({
      locationId: 'output',
      locationDestId: 'customers',
      procureMethod: 'MAKE_TO_ORDER',
      origin: null,
      ruleName: null,
      pickingName: 'WH/OUT/00001',
    });
    const [entry] = planMoveProcurements([move], pullOnlyThreeStepDelivery(), procurementContext(), new Map());

    expect(entry.procurement).toMatchObject({ name: '/', origin: 'WH/OUT/00001' });
  });
});
