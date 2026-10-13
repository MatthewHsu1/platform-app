import { describe, expect, it } from 'vitest';

import {
  moveDeleteRefusal,
  moveLocationRefusal,
  planDeadlineShift,
  planDemandChange,
  planMoveCreate,
  planMoveLocationChange,
} from 'src/stock/utils/plan-move-rules.util';

const LOCATIONS = new Map([
  ['stock', { parentPath: 'wh/stock/', warehouseId: 'w1' }],
  ['shelf', { parentPath: 'wh/stock/shelf/', warehouseId: 'w1' }],
  ['customers', { parentPath: 'customers/', warehouseId: null }],
  ['partner-site', { parentPath: 'customers/site/', warehouseId: null }],
]);
const NEW_MOVE = {
  productUomId: null,
  packagingUomId: null,
  pickingTypeId: null,
  priority: 'NORMAL' as const,
  companyId: null,
  personId: null,
  locationId: null,
  locationDestId: null,
  locationFinalId: null,
  warehouseId: null,
  state: 'DRAFT' as const,
  picked: false,
  additional: false,
};
const READY_DELIVERY = {
  state: 'ASSIGNED' as const,
  locationId: 'stock',
  locationDestId: 'customers',
  pickingTypeId: 'out',
  priority: 'URGENT' as const,
  companyId: 'c1',
  personId: null,
};
const OUT_TYPE = { id: 'out', defaultLocationSrcId: 'stock', defaultLocationDestId: 'customers' };

describe('planMoveCreate', () => {
  it('fills a move added to a ready delivery from it and marks it additional', () => {
    expect(
      planMoveCreate({ move: NEW_MOVE, picking: READY_DELIVERY, pickingType: OUT_TYPE, productUomId: 'units', locations: LOCATIONS }),
    ).toEqual({
      data: {
        productUomId: 'units',
        packagingUomId: 'units',
        pickingTypeId: 'out',
        priority: 'URGENT',
        companyId: 'c1',
        locationId: 'stock',
        locationDestId: 'customers',
        warehouseId: 'w1',
        additional: true,
      },
      autoconfirm: true,
    });
  });

  it('makes a move created on a done transfer done and picked', () => {
    const plan = planMoveCreate({
      move: { ...NEW_MOVE, productUomId: 'units', packagingUomId: 'units', locationId: 'stock', locationDestId: 'customers' },
      picking: { ...READY_DELIVERY, state: 'DONE', priority: 'NORMAL', companyId: null },
      pickingType: OUT_TYPE,
      productUomId: 'units',
      locations: LOCATIONS,
    });
    expect(plan).toEqual({
      data: { pickingTypeId: 'out', warehouseId: 'w1', state: 'DONE', picked: true, additional: true },
      autoconfirm: false,
    });
  });

  it('sends the move to its final location when that lies under the destination', () => {
    const plan = planMoveCreate({
      move: { ...NEW_MOVE, locationFinalId: 'partner-site' },
      picking: { ...READY_DELIVERY, state: 'DRAFT' },
      pickingType: OUT_TYPE,
      productUomId: 'units',
      locations: LOCATIONS,
    });
    expect(plan.data.locationDestId).toBe('partner-site');
    expect(plan.autoconfirm).toBe(false);
  });

  it('keeps the destination when the final location is elsewhere, and uses the type without a transfer', () => {
    const plan = planMoveCreate({
      move: { ...NEW_MOVE, pickingTypeId: 'out', locationFinalId: 'shelf' },
      picking: null,
      pickingType: OUT_TYPE,
      productUomId: 'units',
      locations: LOCATIONS,
    });
    expect(plan.data).toEqual({
      productUomId: 'units',
      packagingUomId: 'units',
      locationId: 'stock',
      locationDestId: 'customers',
      warehouseId: 'w1',
    });
  });
});

describe('planDemandChange', () => {
  const receipt = { pickingId: null, sourceUsage: 'SUPPLIER' as const };

  it('reserves a receipt again when its demand grows', () => {
    expect(
      planDemandChange({
        digits: 2,
        moves: [{ ...receipt, id: 'm', state: 'ASSIGNED', quantity: 10, oldDemand: 10, newDemand: 15 }],
      }),
    ).toEqual({ notes: [], unreserve: [], setPartiallyAvailable: ['m'], reassign: ['m'], recompute: [] });
  });

  it('unreserves and reserves a receipt again when the demand drops below what is reserved', () => {
    expect(
      planDemandChange({
        digits: 2,
        moves: [{ ...receipt, id: 'm', state: 'ASSIGNED', quantity: 10, oldDemand: 10, newDemand: 5 }],
      }),
    ).toEqual({ notes: [], unreserve: ['m'], setPartiallyAvailable: [], reassign: ['m'], recompute: [] });
  });

  it('only recomputes a partially reserved internal move, and notes a change on a transfer', () => {
    expect(
      planDemandChange({
        digits: 2,
        moves: [
          { id: 'm', pickingId: 'p', sourceUsage: 'INTERNAL', state: 'PARTIALLY_AVAILABLE', quantity: 3, oldDemand: 5, newDemand: 3 },
          { id: 'draft', pickingId: 'p', sourceUsage: 'INTERNAL', state: 'DRAFT', quantity: 0, oldDemand: 1, newDemand: 2 },
        ],
      }),
    ).toEqual({ notes: ['m'], unreserve: [], setPartiallyAvailable: [], reassign: [], recompute: ['m', 'draft'] });
  });
});

describe('planDeadlineShift', () => {
  const moves = new Map([
    ['a', { id: 'a', state: 'CONFIRMED' as const, dateDeadline: '2026-10-08T00:00:00.000Z', neighbourIds: ['b'] }],
    ['b', { id: 'b', state: 'WAITING' as const, dateDeadline: '2026-10-12T00:00:00.000Z', neighbourIds: ['a', 'c', 'd', 'e'] }],
    ['c', { id: 'c', state: 'WAITING' as const, dateDeadline: '2026-10-15T00:00:00.000Z', neighbourIds: ['b'] }],
    ['d', { id: 'd', state: 'DONE' as const, dateDeadline: '2026-10-01T00:00:00.000Z', neighbourIds: ['b'] }],
    ['e', { id: 'e', state: 'CONFIRMED' as const, dateDeadline: null, neighbourIds: ['b'] }],
  ]);

  it('shifts every open linked move by the same delta, each once, and gives an empty one the new deadline', () => {
    expect(
      planDeadlineShift({
        changes: [{ moveId: 'a', before: '2026-10-10T00:00:00.000Z', after: '2026-10-08T00:00:00.000Z' }],
        moves,
      }),
    ).toEqual(
      new Map([
        ['b', '2026-10-10T00:00:00.000Z'],
        ['c', '2026-10-13T00:00:00.000Z'],
        ['e', '2026-10-10T00:00:00.000Z'],
      ]),
    );
  });

  it('gives the linked moves the deadline itself when the move had none before', () => {
    expect(
      planDeadlineShift({
        changes: [{ moveId: 'a', before: null, after: '2026-10-08T00:00:00.000Z' }],
        moves,
      }).get('b'),
    ).toBe('2026-10-08T00:00:00.000Z');
  });
});

describe('planMoveLocationChange', () => {
  const lines = [
    { id: 'l-shelf', locationPath: 'wh/stock/shelf/', locationDestPath: 'customers/' },
    { id: 'l-other', locationPath: 'wh/other/', locationDestPath: 'customers/site/' },
  ];

  it('drops lines outside the new source and resets the supply', () => {
    expect(
      planMoveLocationChange({
        sourceChanged: true,
        destinationChanged: false,
        sourcePath: 'wh/stock/',
        destinationPath: 'customers/',
        currentWarehouseId: 'w1',
        sourceWarehouseId: 'w1',
        destinationWarehouseId: null,
        lines,
      }),
    ).toEqual({ destroyLines: ['l-other'], resetSupply: true, relocateLines: [], warehouseId: undefined });
  });

  it('gives lines a new destination when theirs is not under the new one, and follows the warehouse', () => {
    expect(
      planMoveLocationChange({
        sourceChanged: false,
        destinationChanged: true,
        sourcePath: 'wh/',
        destinationPath: 'customers/site/',
        currentWarehouseId: null,
        sourceWarehouseId: 'w1',
        destinationWarehouseId: null,
        lines,
      }),
    ).toEqual({ destroyLines: [], resetSupply: false, relocateLines: ['l-shelf'], warehouseId: 'w1' });
  });
});

describe('moveDeleteRefusal', () => {
  it('refuses a live move linked to another move, then one with done lines', () => {
    expect(moveDeleteRefusal({ state: 'CONFIRMED', hasLinks: true, hasDoneLines: false })).toBe(
      'You can not delete moves linked to another operation',
    );
    expect(moveDeleteRefusal({ state: 'CANCEL', hasLinks: true, hasDoneLines: true })).toBe(
      'Deleting product moves after the transfer is done? Try changing the done quantity to 0 instead.',
    );
    expect(moveDeleteRefusal({ state: 'DRAFT', hasLinks: true, hasDoneLines: false })).toBeNull();
  });
});

describe('moveLocationRefusal', () => {
  const lines = [
    { locationPath: 'wh/stock/shelf/', state: 'ASSIGNED' as const },
    { locationPath: 'wh/other/', state: 'DONE' as const },
  ];

  it('refuses a new source that would drop a done line', () => {
    expect(moveLocationRefusal({ sourceChanged: true, sourcePath: 'wh/stock/', lines })).toBe(
      'The source location cannot change: some of its lines are already done or cancelled and would be removed.',
    );
    expect(
      moveLocationRefusal({ sourceChanged: true, sourcePath: 'wh/stock/', lines: [{ locationPath: 'wh/other/', state: 'CANCEL' }] }),
    ).not.toBeNull();
  });

  it('allows a finished line under the new source, a live line outside it, and a destination-only change', () => {
    expect(moveLocationRefusal({ sourceChanged: true, sourcePath: 'wh/', lines })).toBeNull();
    expect(
      moveLocationRefusal({ sourceChanged: true, sourcePath: 'wh/stock/', lines: [{ locationPath: 'wh/other/', state: 'ASSIGNED' }] }),
    ).toBeNull();
    expect(moveLocationRefusal({ sourceChanged: false, sourcePath: 'wh/stock/', lines })).toBeNull();
  });
});
