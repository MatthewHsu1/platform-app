import { describe, expect, it } from 'vitest';

import {
  productRoutesReport,
  ROUTE_COLOR_COUNT,
  routeRowSegments,
  ruleSegmentMarks,
} from 'src/stock/utils/product-routes-report.util';
import { type RoutesReportCell } from 'src/stock/utils/types/routes-report-cell.type';
import { type RoutesReportRule } from 'src/stock/utils/types/routes-report-rule.type';

// Two warehouses' worth of locations: one-step delivery (WH/Stock → Customers)
// and two-step reception (Vendors → WH/Input → WH/Stock).
const locations = new Map([
  ['vendors', { id: 'vendors', name: 'Partners/Vendors', usage: 'SUPPLIER', warehouseId: null }],
  ['input', { id: 'input', name: 'WH/Input', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['stock', { id: 'stock', name: 'WH/Stock', usage: 'INTERNAL', warehouseId: 'wh' }],
  ['shelf', { id: 'shelf', name: 'WH/Stock/Shelf 2', usage: 'INTERNAL', warehouseId: 'wh' }],
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

  it('shows a lone mark in its own cell', () => {
    expect(routeRowSegments([null, origin, null])).toEqual([
      { span: 1, cell: null },
      { span: 1, cell: origin },
      { span: 1, cell: null },
    ]);
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
