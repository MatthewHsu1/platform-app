import { describe, expect, it } from 'vitest';

import { planProcurementWrites } from 'src/stock/utils/procurement/plan-procurement-writes.util';
import { procurementContext } from 'src/stock/utils/procurement/__tests__/procurement-fixture';
import { locations, routingData } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { type PlannedMove } from 'src/stock/utils/procurement/types/planned-move.type';

const plannedMove = (key: string, values: Partial<PlannedMove>): PlannedMove => ({
  key,
  productId: 'product',
  productUomId: 'unit',
  productUomQty: 1,
  date: '2026-10-10T12:00:00.000Z',
  dateDeadline: null,
  locationId: 'stock',
  locationFinalId: 'customers',
  locationDestId: null,
  ruleId: 'rule',
  pickingTypeId: 'PICK',
  warehouseId: 'WH',
  propagateCancel: false,
  procureMethod: 'MAKE_TO_STOCK',
  companyId: null,
  personId: null,
  moveDests: [],
  referenceIds: [],
  routeIds: [],
  priority: 'NORMAL',
  orderpointId: null,
  origin: 'SO1',
  toRefund: false,
  procurementRun: 'run-1',
  ...values,
});

const counter = () => {
  let next = 0;
  return () => `id-${(next += 1)}`;
};

const data = routingData({
  locationMap: locations({
    customers: { name: 'Customers', usage: 'CUSTOMER' },
    vendors: { name: 'Vendors', usage: 'SUPPLIER' },
    wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
    stock: { name: 'Stock', parentId: 'wh' },
    shelf1: { name: 'Shelf 1', parentId: 'stock' },
    output: { name: 'Output', parentId: 'wh' },
  }),
  routes: [],
  rules: [],
});
const context = procurementContext({
  pickingTypes: new Map([
    ['PICK', { warehouseId: 'WH', defaultLocationDestId: 'output' }],
    ['IN', { warehouseId: 'WH', defaultLocationDestId: 'stock' }],
    ['BARE', { warehouseId: 'WH', defaultLocationDestId: null }],
  ]),
});

describe('planProcurementWrites', () => {
  it('gives each new move its run, destination and unit as packaging, and links it to the moves it feeds', () => {
    const writes = planProcurementWrites(
      {
        moves: [
          plannedMove('planned-1', { moveDests: [{ kind: 'existing', id: 'delivery' }], routeIds: ['mto'], referenceIds: ['ref-1'] }),
          plannedMove('planned-2', { locationDestId: 'stock', locationId: 'vendors', moveDests: [{ kind: 'planned', key: 'planned-1' }] }),
        ],
        partnerUpdates: [{ move: { kind: 'existing', id: 'delivery' }, companyId: 'supplier' }],
        errors: [],
      },
      data,
      context,
      counter(),
    );

    expect(writes.runId).toBe('run-1');
    expect(writes.moves.map((move) => [move.id, move.data.locationDestId, move.data.procurementRun, move.data.packagingUomId])).toEqual([
      ['id-1', 'output', 'run-1', 'unit'],
      ['id-2', 'stock', 'run-1', 'unit'],
    ]);
    expect(writes.moves[0].data).toMatchObject({
      productId: 'product',
      productUomId: 'unit',
      productUomQty: 1,
      locationId: 'stock',
      locationFinalId: 'customers',
      ruleId: 'rule',
      pickingTypeId: 'PICK',
      warehouseId: 'WH',
      procureMethod: 'MAKE_TO_STOCK',
      origin: 'SO1',
    });
    expect(writes.moveLinks).toEqual([
      { id: 'id-3', data: { moveOrigId: 'id-1', moveDestId: 'delivery' } },
      { id: 'id-4', data: { moveOrigId: 'id-2', moveDestId: 'id-1' } },
    ]);
    expect(writes.routeLinks).toEqual([{ id: 'id-5', data: { stockMoveId: 'id-1', stockRouteId: 'mto' } }]);
    expect(writes.referenceLinks).toEqual([{ id: 'id-6', data: { moveId: 'id-1', referenceId: 'ref-1' } }]);
    expect(writes.partnerUpdates).toEqual([{ moveId: 'delivery', companyId: 'supplier' }]);
  });

  it('sends a move straight to its final location when that lies under the destination it would get', () => {
    const writes = planProcurementWrites(
      {
        moves: [
          plannedMove('by-type', { pickingTypeId: 'IN', locationFinalId: 'shelf1' }),
          plannedMove('by-rule', { pickingTypeId: 'PICK', locationDestId: 'stock', locationFinalId: 'shelf1' }),
          plannedMove('no-default', { pickingTypeId: 'BARE', locationFinalId: 'shelf1' }),
        ],
        partnerUpdates: [],
        errors: [],
      },
      data,
      context,
      counter(),
    );

    expect(writes.moves.map((move) => move.data.locationDestId)).toEqual(['shelf1', 'shelf1', null]);
  });

  it('writes on each new move the reordering rule it was ordered for', () => {
    const writes = planProcurementWrites(
      {
        moves: [plannedMove('planned-1', { orderpointId: 'op1' }), plannedMove('planned-2', {})],
        partnerUpdates: [],
        errors: [],
      },
      data,
      context,
      counter(),
    );

    expect(writes.moves.map((move) => move.data.orderpointId)).toEqual(['op1', null]);
  });

  it('refuses a plan whose move feeds a planned move the plan does not hold', () => {
    expect(() =>
      planProcurementWrites(
        { moves: [plannedMove('planned-1', { moveDests: [{ kind: 'planned', key: 'planned-9' }] })], partnerUpdates: [], errors: [] },
        data,
        context,
        counter(),
      ),
    ).toThrow('planned-9');
  });
});
