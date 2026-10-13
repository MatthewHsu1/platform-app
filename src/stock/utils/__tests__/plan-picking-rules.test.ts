import { describe, expect, it } from 'vitest';

import {
  planPickingCreate,
  planPickingLocations,
  planPickingPropagation,
  planScheduledDateTyped,
  planTypeChange,
} from 'src/stock/utils/plan-picking-rules.util';

const SEEDS = { vendorsId: 'vendors', customersId: 'customers' };
const DELIVERY = {
  source: { id: 'stock', usage: 'INTERNAL' as const },
  destination: { id: 'customers', usage: 'CUSTOMER' as const },
};
const CUSTOM_DELIVERY = {
  source: { id: 'stock', usage: 'INTERNAL' as const },
  destination: { id: 'customer-stock', usage: 'CUSTOMER' as const },
};
const RECEIPT = {
  source: { id: 'vendors', usage: 'SUPPLIER' as const },
  destination: { id: 'stock', usage: 'INTERNAL' as const },
};
const OPEN = { state: 'DRAFT' as const, returnPickingId: null };
const customer = { propertyStockSupplierId: null, propertyStockCustomerId: 'customer-location' };
const sibling = { propertyStockSupplierId: 'transit', propertyStockCustomerId: 'transit' };
const noOwnLocation = { propertyStockSupplierId: null, propertyStockCustomerId: null };

describe('planPickingLocations', () => {
  it("takes the contact's customer location over the type's customer default", () => {
    expect(planPickingLocations({ ...OPEN, ...DELIVERY, partner: customer, ...SEEDS })).toEqual({
      locationId: 'stock',
      locationDestId: 'customer-location',
    });
    expect(planPickingLocations({ ...OPEN, ...DELIVERY, partner: sibling, ...SEEDS })?.locationDestId).toBe('transit');
  });

  it('keeps the type default when the contact has no own location', () => {
    expect(planPickingLocations({ ...OPEN, ...CUSTOM_DELIVERY, partner: noOwnLocation, ...SEEDS })?.locationDestId).toBe(
      'customer-stock',
    );
    expect(planPickingLocations({ ...OPEN, ...CUSTOM_DELIVERY, partner: customer, ...SEEDS })?.locationDestId).toBe(
      'customer-location',
    );
  });

  it("takes the contact's vendor location for a receipt, and ignores one equal to the seed", () => {
    expect(planPickingLocations({ ...OPEN, ...RECEIPT, partner: sibling, ...SEEDS })?.locationId).toBe('transit');
    expect(
      planPickingLocations({
        ...OPEN,
        ...RECEIPT,
        partner: { propertyStockSupplierId: 'vendors', propertyStockCustomerId: null },
        ...SEEDS,
      })?.locationId,
    ).toBe('vendors');
  });

  it('leaves done, cancelled and return transfers alone', () => {
    expect(planPickingLocations({ ...DELIVERY, state: 'DONE', returnPickingId: null, partner: customer, ...SEEDS })).toBeNull();
    expect(planPickingLocations({ ...DELIVERY, state: 'DRAFT', returnPickingId: 'p0', partner: customer, ...SEEDS })).toBeNull();
  });
});

describe('planPickingCreate', () => {
  const empty = {
    name: null,
    locationId: null,
    locationDestId: null,
    moveType: 'DIRECT' as const,
    responsibleUserId: null,
    pickingTypeCode: null,
  };

  it('gives the next number, the default locations, the type policy and the creator', () => {
    expect(
      planPickingCreate({
        picking: empty,
        typeMoveType: 'ONE',
        typeCode: 'OUTGOING',
        nextName: 'WH/OUT/00001',
        locations: { locationId: 'stock', locationDestId: 'customers' },
        actingMemberId: 'member-1',
      }),
    ).toEqual({
      name: 'WH/OUT/00001',
      locationId: 'stock',
      locationDestId: 'customers',
      moveType: 'ONE',
      responsibleUserId: 'member-1',
      pickingTypeCode: 'OUTGOING',
    });
  });

  it('keeps what the user typed and names a transfer of a type without sequence "/"', () => {
    expect(
      planPickingCreate({
        picking: { ...empty, locationId: 'shelf', responsibleUserId: 'member-2', pickingTypeCode: 'OUTGOING' },
        typeMoveType: 'DIRECT',
        typeCode: 'OUTGOING',
        nextName: null,
        locations: { locationId: 'stock', locationDestId: 'customers' },
        actingMemberId: 'member-1',
      }),
    ).toEqual({ name: '/', locationDestId: 'customers' });
  });

  it("replaces a code that is not the type's", () => {
    expect(
      planPickingCreate({
        picking: { ...empty, name: 'Typed', pickingTypeCode: 'OUTGOING' },
        typeMoveType: 'DIRECT',
        typeCode: 'INCOMING',
        nextName: null,
        locations: null,
        actingMemberId: undefined,
      }),
    ).toEqual({ pickingTypeCode: 'INCOMING' });
  });

  it('writes nothing for a named transfer without defaults or creator', () => {
    expect(
      planPickingCreate({
        picking: { ...empty, name: 'Typed', pickingTypeCode: 'INTERNAL' },
        typeMoveType: 'DIRECT',
        typeCode: 'INTERNAL',
        nextName: null,
        locations: null,
        actingMemberId: undefined,
      }),
    ).toEqual({});
  });
});

describe('planTypeChange', () => {
  const internal = {
    id: 'int',
    code: 'INTERNAL' as const,
    defaultLocationSrcId: 'stock',
    defaultLocationDestId: 'stock',
    moveType: 'DIRECT' as const,
  };

  it('refuses on a done or cancelled transfer', () => {
    expect(planTypeChange({ state: 'DONE', newType: internal, nextName: 'WH/INT/00001', moveIds: [] })).toEqual({ kind: 'refuse' });
    expect(planTypeChange({ state: 'CANCEL', newType: internal, nextName: 'WH/INT/00001', moveIds: [] })).toEqual({ kind: 'refuse' });
  });

  it('renames, forces the new defaults, policy and type of operation, and moves every move to the new type', () => {
    expect(
      planTypeChange({
        state: 'CONFIRMED',
        newType: internal,
        nextName: 'WH/INT/00001',
        moveIds: [
          { id: 'm1', pickingTypeId: 'out' },
          { id: 'm2', pickingTypeId: 'int' },
        ],
      }),
    ).toEqual({
      kind: 'apply',
      picking: {
        name: 'WH/INT/00001',
        locationId: 'stock',
        locationDestId: 'stock',
        moveType: 'DIRECT',
        pickingTypeCode: 'INTERNAL',
      },
      moves: [{ id: 'm1', pickingTypeId: 'int' }],
    });
  });
});

describe('planPickingPropagation', () => {
  const moves = [
    { id: 'm1', locationId: 'stock', locationDestId: 'customers', companyId: null, personId: 'p1', state: 'ASSIGNED' as const, locationDestUsage: 'CUSTOMER' as const },
    { id: 'scrap', locationId: 'stock', locationDestId: 'scrap', companyId: null, personId: 'p1', state: 'ASSIGNED' as const, locationDestUsage: 'INVENTORY' as const },
  ];

  it('writes the new values on every move except scrap moves', () => {
    expect(planPickingPropagation({ changed: { locationId: 'shelf', personId: null }, moves })).toEqual([
      { id: 'm1', data: { locationId: 'shelf', personId: null } },
    ]);
  });

  it('writes no location onto a done or cancelled move, but still its contact', () => {
    const finished = [
      { ...moves[0], id: 'done', state: 'DONE' as const },
      { ...moves[0], id: 'cancelled', state: 'CANCEL' as const },
    ];

    expect(planPickingPropagation({ changed: { locationId: 'shelf', personId: null }, moves: finished })).toEqual([
      { id: 'done', data: { personId: null } },
      { id: 'cancelled', data: { personId: null } },
    ]);
    expect(planPickingPropagation({ changed: { locationDestId: 'x' }, moves: finished })).toEqual([]);
  });

  it('does not write an emptied location onto the moves', () => {
    expect(planPickingPropagation({ changed: { locationDestId: null }, moves })).toEqual([]);
  });
});

describe('planScheduledDateTyped', () => {
  const moves = [
    { id: 'm1', date: '2026-10-01T09:00:00.000Z' },
    { id: 'm2', date: '2026-10-12T09:00:00.000Z' },
  ];

  it('refuses on a cancelled transfer', () => {
    expect(planScheduledDateTyped({ state: 'CANCEL', scheduledDate: '2026-10-12T09:00:00.000Z', moves })).toEqual({ kind: 'refuse' });
  });

  it('changes nothing on a done transfer', () => {
    expect(planScheduledDateTyped({ state: 'DONE', scheduledDate: '2026-10-12T09:00:00.000Z', moves })).toEqual({
      kind: 'apply',
      moveIds: [],
    });
  });

  it('dates every move of an open transfer', () => {
    expect(planScheduledDateTyped({ state: 'ASSIGNED', scheduledDate: '2026-10-12T09:00:00.000Z', moves })).toEqual({
      kind: 'apply',
      moveIds: ['m1'],
    });
  });
});
