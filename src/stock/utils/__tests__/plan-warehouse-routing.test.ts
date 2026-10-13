import { describe, expect, it } from 'vitest';

import {
  addWarehouse,
  emptyStore,
  planFor,
  reconcile,
  routeRules,
  update,
} from 'src/stock/utils/__tests__/warehouse-routing-store';

const isEmptyPlan = (plan: ReturnType<typeof planFor>) =>
  plan.routeCreates.length === 0 &&
  plan.routeUpdates.length === 0 &&
  plan.routeWarehouseLinks.length === 0 &&
  plan.ruleCreates.length === 0 &&
  plan.ruleUpdates.length === 0 &&
  Object.keys(plan.warehouseUpdates).length === 0 &&
  plan.locationUpdates.length === 0;

describe('planWarehouseRouting', () => {
  it('makes the two routes, their rules and the make-to-order rule of a new warehouse', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH', { name: 'Main' });
    const plan = reconcile(store, id, 'created');
    const warehouse = store.warehouses.get(id)!;

    expect(
      plan.routeCreates.map((route) => [
        route.name,
        route.sequence,
        route.productSelectable,
        route.productCategSelectable,
        route.warehouseSelectable,
        route.linkWarehouse,
      ]),
    ).toEqual([
      ['Main: Receive in 1 step (stock)', 50, false, true, true, true],
      ['Main: Deliver in 1 step (ship)', 60, false, true, true, true],
    ]);
    expect(routeRules(store, warehouse.receptionRouteId)).toEqual(['WH: Vendors → Stock [active]']);
    expect(routeRules(store, warehouse.deliveryRouteId)).toEqual(['WH: Stock → Customers [active]']);
    expect(store.rules.get(warehouse.mtoPullId!)).toMatchObject({
      name: 'WH: Stock → Customers (MTO)',
      routeId: 'mto',
      pickingTypeId: warehouse.outTypeId,
      procureMethod: 'MAKE_TO_ORDER',
      propagateCarrier: true,
      active: true,
      warehouseId: id,
    });
    const [receipt] = [...store.rules.values()].filter((rule) => rule.routeId === warehouse.receptionRouteId);
    const [delivery] = [...store.rules.values()].filter((rule) => rule.routeId === warehouse.deliveryRouteId);
    expect(receipt).toMatchObject({ procureMethod: 'MAKE_TO_STOCK', propagateCancel: false, propagateCarrier: false, auto: 'MANUAL' });
    expect(delivery).toMatchObject({ procureMethod: 'MAKE_TO_STOCK', propagateCancel: false, propagateCarrier: true });
  });

  it('plans nothing on a second run with nothing changed', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH');
    reconcile(store, id, 'created');

    expect(isEmptyPlan(planFor(store, id, 'created'))).toBe(true);
    expect(isEmptyPlan(planFor(store, id, 'updated'))).toBe(true);
  });

  it('builds the three-step chains with make-to-order after the first step and cancel stopping at the last', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH', { receptionSteps: 'THREE_STEPS', deliverySteps: 'PICK_PACK_SHIP' });
    reconcile(store, id, 'created');
    const warehouse = store.warehouses.get(id)!;
    const ofRoute = (routeId: string | null) =>
      [...store.rules.values()]
        .filter((rule) => rule.routeId === routeId)
        .map((rule) => [rule.name, rule.action, rule.procureMethod, rule.propagateCancel]);

    expect(ofRoute(warehouse.receptionRouteId)).toEqual([
      ['WH: Vendors → Stock', 'PULL', 'MAKE_TO_STOCK', true],
      ['WH: Input → Quality Control', 'PUSH', 'MAKE_TO_ORDER', true],
      ['WH: Quality Control → Stock', 'PUSH', 'MAKE_TO_ORDER', false],
    ]);
    expect(ofRoute(warehouse.deliveryRouteId)).toEqual([
      ['WH: Stock → Customers', 'PULL', 'MAKE_TO_STOCK', false],
      ['WH: Packing Zone → Output', 'PUSH', 'MAKE_TO_ORDER', false],
      ['WH: Output → Customers', 'PUSH', 'MAKE_TO_ORDER', false],
    ]);
    expect(store.rules.get(warehouse.mtoPullId!)?.pickingTypeId).toBe(warehouse.pickTypeId);
  });

  // Switching steps back and forth archives and reuses the warehouse's own reception, delivery and
  // make-to-order rules. A supplier's resupply make-to-order rule is made anew each time (resupply tests).
  it('1 → 3 → 1 → 3 steps leaves the same rows', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH');
    reconcile(store, id, 'created');
    update(store, id, { receptionSteps: 'THREE_STEPS', deliverySteps: 'PICK_PACK_SHIP' });
    const afterFirstSwitch = {
      routes: new Map(store.routes),
      rules: new Map([...store.rules].map(([key, rule]) => [key, { ...rule }])),
    };

    update(store, id, { receptionSteps: 'ONE_STEP', deliverySteps: 'SHIP_ONLY' });
    const warehouse = store.warehouses.get(id)!;
    expect(routeRules(store, warehouse.receptionRouteId)).toEqual([
      'WH: Input → Quality Control [archived]',
      'WH: Quality Control → Stock [archived]',
      'WH: Vendors → Stock [active]',
    ]);
    expect(routeRules(store, warehouse.deliveryRouteId)).toEqual([
      'WH: Output → Customers [archived]',
      'WH: Packing Zone → Output [archived]',
      'WH: Stock → Customers [active]',
      'WH: Stock → Customers [archived]',
    ]);
    expect(store.rules.get(warehouse.mtoPullId!)?.pickingTypeId).toBe(warehouse.outTypeId);

    const plan = update(store, id, { receptionSteps: 'THREE_STEPS', deliverySteps: 'PICK_PACK_SHIP' });
    expect(plan.ruleCreates).toEqual([]);
    expect(plan.routeCreates).toEqual([]);
    expect([...store.routes.keys()]).toEqual([...afterFirstSwitch.routes.keys()]);
    expect([...store.rules.values()].map((rule) => [rule.id, rule.active, rule.pickingTypeId])).toEqual(
      [...afterFirstSwitch.rules.values()].map((rule) => [rule.id, rule.active, rule.pickingTypeId]),
    );
  });

  it('rebuilds both routes on a change of either steps, making a missing receipt route', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH', { name: 'Main' });
    update(store, id, { deliverySteps: 'PICK_SHIP' });
    const warehouse = store.warehouses.get(id)!;

    expect(store.routes.get(warehouse.receptionRouteId!)?.name).toBe('Main: Receive in 1 step (stock)');
    expect(routeRules(store, warehouse.receptionRouteId)).toEqual(['WH: Vendors → Stock [active]']);
    expect(store.routes.get(warehouse.deliveryRouteId!)?.name).toBe('Main: Deliver in 2 steps (pick + ship)');
    expect(store.rules.get(warehouse.mtoPullId!)?.pickingTypeId).toBe(warehouse.pickTypeId);
  });

  it('renames the routes by step and keeps the make-to-order rule, retyped, on a step switch', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH', { name: 'Main' });
    reconcile(store, id, 'created');
    const mtoRuleId = store.warehouses.get(id)!.mtoPullId;
    update(store, id, { deliverySteps: 'PICK_SHIP', receptionSteps: 'TWO_STEPS' });
    const warehouse = store.warehouses.get(id)!;

    expect(store.routes.get(warehouse.receptionRouteId!)?.name).toBe('Main: Receive in 2 steps (input + stock)');
    expect(store.routes.get(warehouse.deliveryRouteId!)?.name).toBe('Main: Deliver in 2 steps (pick + ship)');
    expect(warehouse.mtoPullId).toBe(mtoRuleId);
    expect(store.rules.get(mtoRuleId!)?.pickingTypeId).toBe(warehouse.pickTypeId);
  });

  it('puts the new warehouse name in place of the old one in its routes and their rules', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'CHIC', { name: 'Chicago' });
    reconcile(store, id, 'created');
    update(store, id, { name: 'Windy City' });
    const warehouse = store.warehouses.get(id)!;

    expect(store.routes.get(warehouse.receptionRouteId!)?.name).toBe('Windy City: Receive in 1 step (stock)');
    expect(store.routes.get(warehouse.deliveryRouteId!)?.name).toBe('Windy City: Deliver in 1 step (ship)');
    expect(store.rules.get(warehouse.mtoPullId!)?.name).toBe('CHIC: Stock → Customers (MTO)');
  });

  // Staff can empty a rule's name; it reads back as null.
  it('renames the named routes of a renamed warehouse and leaves a rule with no name as it is', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'CHIC', { name: 'Chicago' });
    reconcile(store, id, 'created');
    const warehouse = store.warehouses.get(id)!;
    const [receipt] = [...store.rules.values()].filter((rule) => rule.routeId === warehouse.receptionRouteId);
    receipt.name = null;

    update(store, id, { name: 'Windy City' });

    expect(store.routes.get(warehouse.receptionRouteId!)?.name).toBe('Windy City: Receive in 1 step (stock)');
    expect(store.rules.get(receipt.id)?.name).toBeNull();
  });

  it('renames the routes of an archived warehouse and their archived rules too', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WH');
    reconcile(store, id, 'created');
    update(store, id, { active: false });
    update(store, id, { name: 'Main' });
    const warehouse = store.warehouses.get(id)!;

    expect(store.routes.get(warehouse.receptionRouteId!)).toMatchObject({ name: 'Main: Receive in 1 step (stock)', active: false });
    expect(routeRules(store, warehouse.receptionRouteId)).toEqual(['Main: Vendors → Stock [archived]']);
  });

  it('archives the routes and rules with the warehouse, and brings back only the ones its steps want', () => {
    const store = emptyStore();
    const id = addWarehouse(store, 'WIL', { name: 'The attic of Willy' });
    reconcile(store, id, 'created');
    update(store, id, { active: false });
    let warehouse = store.warehouses.get(id)!;

    expect(store.rules.get(warehouse.mtoPullId!)?.active).toBe(false);
    expect(store.routes.get(warehouse.receptionRouteId!)?.active).toBe(false);
    expect(store.routes.get(warehouse.deliveryRouteId!)?.active).toBe(false);

    update(store, id, { active: true });
    warehouse = store.warehouses.get(id)!;
    expect(store.rules.get(warehouse.mtoPullId!)?.active).toBe(true);
    expect(store.routes.get(warehouse.receptionRouteId!)?.active).toBe(true);
    expect(store.routes.get(warehouse.deliveryRouteId!)?.active).toBe(true);
  });

  it('keeps a route another warehouse also uses, and reactivates a route archived by hand when the warehouse comes back', () => {
    const store = emptyStore();
    const other = addWarehouse(store, 'WH');
    reconcile(store, other, 'created');
    const id = addWarehouse(store, 'WIL', { receptionSteps: 'TWO_STEPS', deliverySteps: 'PICK_PACK_SHIP' });
    reconcile(store, id, 'created');
    let warehouse = store.warehouses.get(id)!;
    store.routes.get(warehouse.receptionRouteId!)!.warehouseIds.push(other);
    store.routes.get(warehouse.deliveryRouteId!)!.active = false;

    update(store, id, { active: false });
    warehouse = store.warehouses.get(id)!;
    expect(store.rules.get(warehouse.mtoPullId!)?.active).toBe(false);
    expect(store.routes.get(warehouse.receptionRouteId!)?.active).toBe(true);
    expect(store.routes.get(warehouse.deliveryRouteId!)?.active).toBe(false);

    update(store, id, { active: true });
    warehouse = store.warehouses.get(id)!;
    expect(store.rules.get(warehouse.mtoPullId!)?.active).toBe(true);
    expect(store.routes.get(warehouse.deliveryRouteId!)?.active).toBe(true);
    expect(routeRules(store, warehouse.receptionRouteId)).toEqual(['WIL: Input → Stock [active]', 'WIL: Vendors → Stock [active]']);
  });

  it('makes no make-to-order rule when the make-to-order route was deleted', () => {
    const store = emptyStore();
    store.mtoRouteId = null;
    const id = addWarehouse(store, 'WH');
    reconcile(store, id, 'created');

    expect(store.warehouses.get(id)?.mtoPullId).toBeNull();
  });
});
