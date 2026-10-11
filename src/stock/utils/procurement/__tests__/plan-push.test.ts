import { describe, expect, it } from 'vitest';

import { planPush } from 'src/stock/utils/procurement/plan-push.util';
import { locations, product, route, routingData, rule, warehouseWorld } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { type PushMove } from 'src/stock/utils/procurement/types/push-move.type';

const withPriority = (move: PushMove, priority: string | undefined): PushMove =>
  priority === undefined ? move : { ...move, filterRecord: { ...move.filterRecord, priority } };

const doneMove = (values: Partial<PushMove> & Pick<PushMove, 'locationId' | 'locationDestId'>, filterPriority?: string): PushMove =>
  withPriority(
    {
      id: 'done',
      productId: 'product',
      productUomId: 'unit',
      quantity: 1,
      productUomQty: 1,
      locationFinalId: null,
      date: '2026-10-10T12:00:00.000Z',
      dateDeadline: null,
      warehouseId: 'WH',
      pickingTypeWarehouseId: 'WH',
      routeIds: [],
      resultPackageTypeRouteIds: [],
      packagingUomId: null,
      isInventory: false,
      originReturnedMoveDestId: null,
      origin: null,
      pickingName: 'WH/PICK/00001',
      companyId: null,
      personId: null,
      partnerCustomerLocationId: null,
      restrictPartnerId: null,
      descriptionPickingManual: null,
      sequence: 10,
      referenceIds: [],
      filterRecord: {
        productUomQty: 1,
        quantity: 1,
        origin: null,
        priority: 'NORMAL',
        date: '2026-10-10T12:00:00.000Z',
        product: { name: 'Desk Combination', defaultCode: null, barcode: null },
        category: null,
        picking: null,
      },
      moveDests: [],
      ...values,
    },
    filterPriority,
  );

const twoStepDelivery = (extraLocations: Record<string, { name: string; parentId?: string; usage?: 'CUSTOMER' | 'INTERNAL' }> = {}) => {
  const world = warehouseWorld({ delivery: 'PICK_SHIP' });
  const locationMap = locations({
    customers: { name: 'Customers', usage: 'CUSTOMER' },
    wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
    stock: { name: 'Stock', parentId: 'wh' },
    output: { name: 'Output', parentId: 'wh' },
    ...extraLocations,
  });

  return routingData({ locationMap, routes: world.routes, rules: world.rules, warehouseRouteIds: world.warehouseRouteIds });
};

describe('planPush', () => {
  it('makes the Output → Customers move after a pick is done, linked from the pick', () => {
    const plan = planPush(doneMove({ locationId: 'stock', locationDestId: 'output', quantity: 3, productUomQty: 4 }), product(), twoStepDelivery());

    expect(plan).toMatchObject({
      kind: 'manual',
      ruleId: 'ship',
      linkFromDone: true,
      newMove: {
        productUomQty: 3,
        origin: 'WH/PICK/00001',
        locationId: 'output',
        locationDestId: 'customers',
        locationFinalId: null,
        pickingTypeId: 'OUT',
        warehouseId: 'WH',
        procureMethod: 'MAKE_TO_ORDER',
        date: '2026-10-10T12:00:00.000Z',
        packagingUomId: 'unit',
        sequence: 10,
      },
    });
  });

  it('names the new move "/" when the done move has no origin and no transfer name', () => {
    const plan = planPush(
      doneMove({ locationId: 'stock', locationDestId: 'output', origin: null, pickingName: null }),
      product(),
      twoStepDelivery(),
    );

    expect(plan).toMatchObject({ kind: 'manual', newMove: { origin: '/' } });
  });

  it('starts the new move at normal priority, as a move with no transfer has', () => {
    const plan = planPush(doneMove({ locationId: 'stock', locationDestId: 'output' }, 'URGENT'), product(), twoStepDelivery());

    expect(plan).toMatchObject({ kind: 'manual', newMove: { priority: 'NORMAL' } });
  });

  it('ends the chain at the final location when it lies under the rule destination', () => {
    const data = twoStepDelivery({ partnerStock: { name: 'Partner Stock', parentId: 'customers', usage: 'CUSTOMER' } });
    const plan = planPush(doneMove({ locationId: 'stock', locationDestId: 'output', locationFinalId: 'partnerStock' }), product(), data);

    expect(plan).toMatchObject({ kind: 'manual', newMove: { locationDestId: 'partnerStock', locationFinalId: 'partnerStock' } });
  });

  it("sends to the partner's customer location when the rule goes to a customer location", () => {
    const data = twoStepDelivery({ partnerSite: { name: 'Gym site', usage: 'CUSTOMER' } });
    const plan = planPush(
      doneMove({ locationId: 'stock', locationDestId: 'output', companyId: 'gym', partnerCustomerLocationId: 'partnerSite' }),
      product(),
      data,
    );

    expect(plan).toMatchObject({ kind: 'manual', newMove: { locationDestId: 'partnerSite', companyId: 'gym' } });
  });

  it('moves the done move itself for an automatic rule with no step added', () => {
    const newRoute = route('new-route');
    const locationMap = locations({
      vendors: { name: 'Vendors', usage: 'SUPPLIER' },
      wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
      stock: { name: 'Stock', parentId: 'wh' },
      newLocation: { name: 'New_location' },
    });
    const data = routingData({
      locationMap,
      routes: [newRoute],
      rules: [
        rule(
          'auto',
          { routeId: 'new-route', action: 'PUSH', auto: 'TRANSPARENT', delay: 1, locationSrcId: 'stock', locationDestId: 'newLocation', pickingTypeId: 'NPT' },
          [newRoute],
        ),
      ],
    });
    const plan = planPush(doneMove({ locationId: 'vendors', locationDestId: 'stock' }), product({ routeIds: ['new-route'] }), data);

    expect(plan).toEqual({ kind: 'transparent', ruleId: 'auto', date: '2026-10-11T12:00:00.000Z', locationDestId: 'newLocation', destinationChanged: true });
  });

  it('skips a rule whose filter the move does not match, and takes the next', () => {
    const world = warehouseWorld({ delivery: 'PICK_SHIP' });
    const express = route('express', { sequence: 1 });
    const routes = [...world.routes, express];
    const data = routingData({
      locationMap: twoStepDelivery().locations,
      routes,
      rules: [
        ...world.rules,
        rule(
          'express-ship',
          {
            routeId: 'express',
            action: 'PUSH',
            locationSrcId: 'output',
            locationDestId: 'customers',
            pickingTypeId: 'EXPRESS',
            pushDomain: { combinator: 'and', rules: [{ field: 'priority', operator: '=', value: 'URGENT' }] },
          },
          routes,
        ),
      ],
      warehouseRouteIds: { WH: ['reception', 'delivery', 'express'] },
    });

    expect(planPush(doneMove({ locationId: 'stock', locationDestId: 'output' }, 'URGENT'), product(), data)).toMatchObject({
      ruleId: 'express-ship',
    });
    expect(planPush(doneMove({ locationId: 'stock', locationDestId: 'output' }, 'NORMAL'), product(), data)).toMatchObject({
      ruleId: 'ship',
    });
  });

  it('does not push a count or a move whose next step already starts in its destination', () => {
    const data = twoStepDelivery();

    expect(planPush(doneMove({ locationId: 'stock', locationDestId: 'output', isInventory: true }), product(), data)).toEqual({ kind: 'skip' });
    expect(
      planPush(doneMove({ locationId: 'stock', locationDestId: 'output', moveDests: [{ id: 'ship', locationId: 'output', ruleId: null }] }), product(), data),
    ).toEqual({ kind: 'skip' });
  });

  it('does not push a return back where its original move went', () => {
    const plan = planPush(doneMove({ locationId: 'stock', locationDestId: 'output', originReturnedMoveDestId: 'customers' }), product(), twoStepDelivery());

    expect(plan).toEqual({ kind: 'none', breakLinks: [] });
  });

  it('does nothing on a second run when the pushed move exists', () => {
    const plan = planPush(
      doneMove({ locationId: 'stock', locationDestId: 'output', moveDests: [{ id: 'pushed', locationId: 'shelf', ruleId: 'ship' }] }),
      product(),
      twoStepDelivery({ shelf: { name: 'Shelf', parentId: 'wh' } }),
    );

    expect(plan).toEqual({ kind: 'none', breakLinks: [] });
  });

  it('takes a non-storable product from stock on the new move', () => {
    const plan = planPush(doneMove({ locationId: 'stock', locationDestId: 'output' }), product({ isStorable: false }), twoStepDelivery());

    expect(plan).toMatchObject({ kind: 'manual', newMove: { procureMethod: 'MAKE_TO_STOCK' }, linkFromDone: true });
  });

  it('hangs the next steps that start at the final location on the new move and cuts the ones outside the destination', () => {
    const data = twoStepDelivery({ partnerStock: { name: 'Partner Stock', parentId: 'customers', usage: 'CUSTOMER' }, pack: { name: 'Pack', parentId: 'wh' } });
    const plan = planPush(
      doneMove({
        locationId: 'stock',
        locationDestId: 'output',
        locationFinalId: 'partnerStock',
        moveDests: [
          { id: 'at-final', locationId: 'partnerStock', ruleId: null },
          { id: 'elsewhere', locationId: 'pack', ruleId: null },
        ],
      }),
      product(),
      data,
    );

    expect(plan).toMatchObject({ kind: 'manual', relinkToNewMove: ['at-final'], breakLinks: ['elsewhere'] });
  });
});
