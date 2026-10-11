import { describe, expect, it } from 'vitest';

import {
  categoryChain,
  categoryTotalRouteIds,
  productRoutesReport,
  ROUTE_COLOR_COUNT,
  routeRowSegments,
  ruleSegmentMarks,
} from 'src/stock/utils/product-routes-report.util';
import { type RoutesReportCell } from 'src/stock/utils/types/routes-report-cell.type';
import { type RoutesReportRule } from 'src/stock/utils/types/routes-report-rule.type';

// One-step delivery (WH/Stock → Customers), two-step reception
// (Vendors → WH/Input → WH/Stock), and a second warehouse resupplied from WH.
const locations = new Map([
  ['vendors', { id: 'vendors', name: 'Partners/Vendors', usage: 'SUPPLIER', warehouseId: null }],
  ['input', { id: 'input', name: 'WH/Input', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['stock', { id: 'stock', name: 'WH/Stock', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['shelf', { id: 'shelf', name: 'WH/Stock/Shelf 2', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['bin', { id: 'bin', name: 'WH/Stock/Bin', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['stock2', { id: 'stock2', name: 'WH2/Stock', usage: 'INTERNAL', warehouseId: 'wh2' }],
  ['customers', { id: 'customers', name: 'Partners/Customers', usage: 'CUSTOMER', warehouseId: null }],
]);

const rule = (overrides: Partial<RoutesReportRule> & Pick<RoutesReportRule, 'id' | 'routeId'>): RoutesReportRule => ({
  name: overrides.id,
  action: 'PULL',
  procureMethod: 'MAKE_TO_STOCK',
  locationSrcId: null,
  locationDestId: 'stock',
  pickingTypeDefaultDestId: null,
  pickingTypeName: null,
  warehouseId: 'wh',
  ...overrides,
});

const kinds = (cells: RoutesReportCell[]) => cells.map((cell) => cell?.kind ?? null);

describe('productRoutesReport', () => {
  it('orders vendors first, then the warehouse chain, then customers, with one colour per route', () => {
    const report = productRoutesReport({
      routes: [
        { id: 'receive', name: 'Receive in 2 steps', ruleIds: ['in', 'store'] },
        { id: 'deliver', name: 'Deliver in 1 step', ruleIds: ['out'] },
      ],
      rules: [
        rule({ id: 'in', routeId: 'receive', locationSrcId: 'vendors', locationDestId: 'input', pickingTypeDefaultDestId: 'input' }),
        rule({ id: 'store', routeId: 'receive', action: 'PUSH', locationSrcId: 'input', locationDestId: 'stock' }),
        rule({ id: 'out', routeId: 'deliver', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeDefaultDestId: 'customers' }),
      ],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [{ id: 'op', name: 'OP/00001', locationId: 'stock', productMinQty: 5, productMaxQty: 20 }],
      putaways: [{ id: 'put', locationInId: 'stock', locationOutName: 'WH/Stock/Shelf 2' }],
    });

    expect(report.locations.map((location) => location.id)).toEqual(['vendors', 'input', 'stock', 'customers']);
    expect(report.headers).toEqual({
      stock: {
        putaway: [{ id: 'put', locationInId: 'stock', locationOutName: 'WH/Stock/Shelf 2' }],
        orderpoint: [{ id: 'op', name: 'OP/00001', locationId: 'stock', productMinQty: 5, productMaxQty: 20 }],
      },
    });
    expect(report.rows.map((row) => [row.ruleId, row.colorIndex, kinds(row.cells)])).toEqual([
      ['in', 0, ['origin', 'destination', null, null]],
      ['store', 0, [null, 'origin', 'destination', null]],
      ['out', 1, [null, null, 'origin', 'destination']],
    ]);
  });

  it('uses the operation type destination for a pull rule and skips rules of other warehouses', () => {
    const report = productRoutesReport({
      routes: [{ id: 'deliver', name: 'Deliver', ruleIds: ['out', 'other'] }],
      rules: [
        rule({ id: 'out', routeId: 'deliver', locationSrcId: 'stock', locationDestId: 'input', pickingTypeDefaultDestId: 'customers' }),
        rule({ id: 'other', routeId: 'deliver', locationSrcId: 'stock', warehouseId: 'wh2' }),
      ],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [],
      putaways: [],
    });

    expect(report.rows.map((row) => row.ruleId)).toEqual(['out']);
    expect(report.locations.map((location) => location.id)).toEqual(['stock', 'customers']);
  });

  it('gives each route the colour of its place in the list, counting routes that show no rule', () => {
    const report = productRoutesReport({
      routes: [
        { id: 'elsewhere', name: 'Other warehouse', ruleIds: ['far'] },
        { id: 'deliver', name: 'Deliver', ruleIds: ['out'] },
      ],
      rules: [
        rule({ id: 'far', routeId: 'elsewhere', locationSrcId: 'stock', warehouseId: 'wh2' }),
        rule({ id: 'out', routeId: 'deliver', locationSrcId: 'stock', pickingTypeDefaultDestId: 'customers' }),
      ],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [],
      putaways: [],
    });

    expect(report.rows.map((row) => [row.ruleId, row.colorIndex])).toEqual([['out', 1]]);
  });

  it('wraps the colours after seven routes', () => {
    const routes = Array.from({ length: 8 }, (_, index) => ({ id: `r${index}`, name: `Route ${index}`, ruleIds: [`rule${index}`] }));
    const report = productRoutesReport({
      routes,
      rules: routes.map((route, index) =>
        rule({ id: `rule${index}`, routeId: route.id, locationSrcId: 'stock', pickingTypeDefaultDestId: 'customers' }),
      ),
      locations,
      warehouseIds: ['wh'],
      orderpoints: [],
      putaways: [],
    });

    expect(ROUTE_COLOR_COUNT).toBe(7);
    expect(report.rows.map((row) => row.colorIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 0]);
  });

  it('adds the locations of reordering rules that no rule touches, after the others', () => {
    const report = productRoutesReport({
      routes: [{ id: 'deliver', name: 'Deliver', ruleIds: ['out'] }],
      rules: [rule({ id: 'out', routeId: 'deliver', locationSrcId: 'stock', pickingTypeDefaultDestId: 'customers' })],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [{ id: 'op', name: 'OP/00002', locationId: 'shelf', productMinQty: 1, productMaxQty: 4 }],
      putaways: [],
    });

    expect(report.locations.map((location) => location.id)).toEqual(['stock', 'customers', 'shelf']);
    expect(Object.keys(report.headers)).toEqual(['shelf']);
    expect(kinds(report.rows[0].cells)).toEqual(['origin', 'destination', null]);
  });

  it('lays out each chosen warehouse in turn, a resupplied warehouse after the one feeding it', () => {
    const report = productRoutesReport({
      routes: [
        { id: 'receive', name: 'Receive in 2 steps', ruleIds: ['in', 'store'] },
        { id: 'resupply', name: 'Supply WH2 from WH', ruleIds: ['supply'] },
        { id: 'deliver', name: 'WH2: Deliver in 1 step', ruleIds: ['out2'] },
      ],
      rules: [
        rule({ id: 'in', routeId: 'receive', locationSrcId: 'vendors', pickingTypeDefaultDestId: 'input' }),
        rule({ id: 'store', routeId: 'receive', action: 'PUSH', locationSrcId: 'input', locationDestId: 'stock' }),
        rule({ id: 'supply', routeId: 'resupply', locationSrcId: 'stock', pickingTypeDefaultDestId: 'stock2', warehouseId: 'wh2' }),
        rule({ id: 'out2', routeId: 'deliver', locationSrcId: 'stock2', pickingTypeDefaultDestId: 'customers', warehouseId: 'wh2' }),
      ],
      locations,
      warehouseIds: ['wh', 'wh2'],
      orderpoints: [],
      putaways: [],
    });

    expect(report.locations.map((location) => location.id)).toEqual(['vendors', 'input', 'stock', 'stock2', 'customers']);
    expect(report.rows.map((row) => [row.ruleId, row.colorIndex, kinds(row.cells)])).toEqual([
      ['in', 0, ['origin', 'destination', null, null, null]],
      ['store', 0, [null, 'origin', 'destination', null, null]],
      ['supply', 1, [null, null, 'origin', 'destination', null]],
      ['out2', 2, [null, null, null, 'origin', 'destination']],
    ]);
  });

  it('starts again from the sources when no rule leads into a warehouse, before customers', () => {
    const report = productRoutesReport({
      routes: [{ id: 'loop', name: 'Loop', ruleIds: ['down', 'up', 'bin', 'ship'] }],
      rules: [
        rule({ id: 'down', routeId: 'loop', action: 'PUSH', locationSrcId: 'stock', locationDestId: 'shelf' }),
        rule({ id: 'up', routeId: 'loop', action: 'PUSH', locationSrcId: 'shelf', locationDestId: 'stock' }),
        rule({ id: 'bin', routeId: 'loop', action: 'PUSH', locationSrcId: 'shelf', locationDestId: 'bin' }),
        rule({ id: 'ship', routeId: 'loop', locationSrcId: 'shelf', pickingTypeDefaultDestId: 'customers' }),
      ],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [],
      putaways: [],
    });

    expect(report.locations.map((location) => location.id)).toEqual(['stock', 'shelf', 'bin', 'customers']);
  });

  it('marks the source over the destination when a rule starts and ends in the same location', () => {
    const report = productRoutesReport({
      routes: [{ id: 'loop', name: 'Loop', ruleIds: ['same'] }],
      rules: [rule({ id: 'same', routeId: 'loop', action: 'PUSH', locationSrcId: 'stock', locationDestId: 'stock' })],
      locations,
      warehouseIds: ['wh'],
      orderpoints: [],
      putaways: [],
    });

    expect(kinds(report.rows[0].cells)).toEqual(['origin']);
  });
});

describe('routeRowSegments', () => {
  const origin: RoutesReportCell = { kind: 'origin' };
  const destination: RoutesReportCell = { kind: 'destination' };

  it('joins the cells from the first mark to the second into one span that carries the second mark', () => {
    expect(routeRowSegments([null, origin, null, destination, null])).toEqual([
      { span: 1, cell: null },
      { span: 3, cell: destination },
      { span: 1, cell: null },
    ]);
  });

  it('carries the origin when the rule runs from right to left', () => {
    expect(routeRowSegments([destination, origin])).toEqual([{ span: 2, cell: origin }]);
  });

  it('leaves the row short after a lone mark, as nothing closes its line', () => {
    expect(routeRowSegments([null, origin, null])).toEqual([{ span: 1, cell: null }]);
  });
});

describe('ruleSegmentMarks', () => {
  it('draws a pull rule running left to right with its arrow at the destination', () => {
    expect(ruleSegmentMarks('destination', 'PULL', 'MAKE_TO_STOCK')).toEqual({ before: [], after: ['RIGHT'] });
  });

  it('draws a push rule running left to right with its arrow at the source', () => {
    expect(ruleSegmentMarks('destination', 'PUSH', 'MAKE_TO_STOCK')).toEqual({ before: ['RIGHT'], after: [] });
  });

  it('shows that a rule triggers another rule, or another rule if there is no stock', () => {
    expect(ruleSegmentMarks('destination', 'PULL', 'MAKE_TO_ORDER')).toEqual({ before: ['POINTS'], after: ['RIGHT'] });
    expect(ruleSegmentMarks('destination', 'PULL', 'MTS_ELSE_MTO')).toEqual({ before: ['POINTS', 'BAR'], after: ['RIGHT'] });
  });

  it('draws a rule running right to left with the arrows pointing left', () => {
    expect(ruleSegmentMarks('origin', 'PULL', 'MAKE_TO_STOCK')).toEqual({ before: ['LEFT'], after: [] });
    expect(ruleSegmentMarks('origin', 'PULL_PUSH', 'MAKE_TO_ORDER')).toEqual({ before: ['LEFT'], after: ['LEFT', 'POINTS'] });
  });
});

describe('categoryTotalRouteIds', () => {
  const route = (id: string, sequence: number) => ({ id, sequence, createdAt: '2026-10-01T00:00:00.000Z' });

  it('lists the own routes, then each parent level going up, every level in route order', () => {
    expect(
      categoryTotalRouteIds({
        categoryIds: ['child', 'parent', 'grandparent'],
        links: [
          { productCategoryId: 'grandparent', stockRouteId: 'b' },
          { productCategoryId: 'parent', stockRouteId: 'a' },
          { productCategoryId: 'child', stockRouteId: 'own2' },
          { productCategoryId: 'child', stockRouteId: 'own1' },
          { productCategoryId: 'grandparent', stockRouteId: 'own1' },
        ],
        routes: new Map([
          ['a', route('a', 20)],
          ['b', route('b', 10)],
          ['own1', route('own1', 5)],
          ['own2', route('own2', 30)],
        ]),
      }),
    ).toEqual(['own1', 'own2', 'a', 'b']);
  });

  it('leaves out routes that are archived or unreadable', () => {
    expect(
      categoryTotalRouteIds({
        categoryIds: ['child', 'parent'],
        links: [
          { productCategoryId: 'parent', stockRouteId: 'archived' },
          { productCategoryId: 'parent', stockRouteId: 'a' },
        ],
        routes: new Map([['a', route('a', 1)]]),
      }),
    ).toEqual(['a']);
  });
});

describe('categoryChain', () => {
  it('reads the stored root-first path as the category and its parents, nearest first', () => {
    expect(categoryChain('self', 'root/parent/self/')).toEqual(['self', 'parent', 'root']);
  });

  it('falls back to the category alone when the path is empty or not yet its own', () => {
    expect(categoryChain('self', '')).toEqual(['self']);
    expect(categoryChain('self', 'root/other/')).toEqual(['self']);
  });
});
