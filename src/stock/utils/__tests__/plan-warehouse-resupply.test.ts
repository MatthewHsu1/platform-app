import { describe, expect, it } from 'vitest';

import { addWarehouse, emptyStore, reconcile, routeRules, update } from 'src/stock/utils/__tests__/warehouse-routing-store';

describe('planWarehouseRouting: resupply routes', () => {
  it('archives the resupply route when its supplier is removed and brings the same route back when it is added again', () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_A', { name: 'Warehouse A' });
    reconcile(store, supplier, 'created');
    const id = addWarehouse(store, 'WH_B', { name: 'Warehouse B' });
    reconcile(store, id, 'created');

    reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    const [route] = [...store.routes.values()].filter((row) => row.suppliedWhId === id);
    expect(route).toMatchObject({
      name: 'Warehouse B: Supply Product from Warehouse A',
      active: true,
      supplierWhId: supplier,
      productSelectable: true,
      productCategSelectable: true,
      warehouseSelectable: true,
    });
    expect(store.locations.get('transit')?.active).toBe(true);

    reconcile(store, id, 'updated', { resupplyRemoved: [supplier] });
    expect(store.routes.get(route.id)?.active).toBe(false);

    const plan = reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    expect(plan.routeCreates).toEqual([]);
    expect(store.routes.get(route.id)?.active).toBe(true);
  });

  it('makes one resupply route per supplier', () => {
    const store = emptyStore();
    const [a, b, c] = ['WH_A', 'WH_B', 'WH_C'].map((code) => {
      const warehouseId = addWarehouse(store, code);
      reconcile(store, warehouseId, 'created');
      return warehouseId;
    });
    reconcile(store, a, 'updated', { resupplyAdded: [b] });
    reconcile(store, a, 'updated', { resupplyAdded: [c] });

    expect([...store.routes.values()].filter((route) => route.suppliedWhId === a).map((route) => route.supplierWhId)).toEqual([b, c]);
  });

  it('gives each warehouse resupplied from a one-step supplier its own Stock → transit make-to-order rule', () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_A');
    reconcile(store, supplier, 'created');
    for (const code of ['WH_B', 'WH_C']) {
      const id = addWarehouse(store, code);
      reconcile(store, id, 'created');
      reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    }

    expect(routeRules(store, 'mto').filter((rule) => rule.startsWith('WH_A: Stock → Inter-warehouse transit'))).toEqual([
      'WH_A: Stock → Inter-warehouse transit (MTO) [active]',
      'WH_A: Stock → Inter-warehouse transit (MTO) [active]',
    ]);
  });

  it('resupplies from the Output of a multi-step supplier through transit into Stock', () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_A', { deliverySteps: 'PICK_PACK_SHIP' });
    reconcile(store, supplier, 'created');
    const id = addWarehouse(store, 'WH_B', { receptionSteps: 'THREE_STEPS' });
    reconcile(store, id, 'created');
    reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    const [route] = [...store.routes.values()].filter((row) => row.suppliedWhId === id);

    expect(
      [...store.rules.values()]
        .filter((rule) => rule.routeId === route.id)
        .map((rule) => [rule.name, rule.procureMethod, rule.warehouseId, rule.locationDestFromRule]),
    ).toEqual([
      ['WH_A: Output → Inter-warehouse transit', 'MAKE_TO_ORDER', supplier, true],
      ['WH_A: Stock → Output', 'MAKE_TO_STOCK', supplier, false],
      ['WH_B: Inter-warehouse transit → Stock', 'MAKE_TO_ORDER', id, false],
    ]);
  });

  it("moves a supplier's resupply rules with its delivery steps, archiving and reusing the Stock → Output rule", () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_X', { name: 'Warehouse X' });
    reconcile(store, supplier, 'created');
    const id = addWarehouse(store, 'WH_Y', { name: 'Warehouse Y' });
    reconcile(store, id, 'created');
    reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    const [route] = [...store.routes.values()].filter((row) => row.suppliedWhId === id);
    const toTransit = [...store.rules.values()].find((rule) => rule.routeId === route.id && rule.locationDestId === 'transit')!;
    const x = () => store.warehouses.get(supplier)!;

    expect(routeRules(store, route.id)).toHaveLength(2);
    expect(toTransit.locationSrcId).toBe(x().lotStockId);

    update(store, supplier, { deliverySteps: 'PICK_PACK_SHIP' });
    expect(routeRules(store, route.id)).toEqual([
      'WH_X: Stock → Inter-warehouse transit [active]',
      'WH_X: Stock → Output [active]',
      'WH_Y: Inter-warehouse transit → Stock [active]',
    ]);
    expect(store.rules.get(toTransit.id)).toMatchObject({ locationSrcId: x().whOutputStockLocId, procureMethod: 'MAKE_TO_ORDER' });
    const stockToOutput = [...store.rules.values()].find(
      (rule) => rule.routeId === route.id && rule.locationDestId === x().whOutputStockLocId,
    )!;

    const unchanged = update(store, supplier, { deliverySteps: 'PICK_SHIP' });
    expect(unchanged.ruleCreates).toEqual([]);
    expect(store.rules.get(toTransit.id)?.locationSrcId).toBe(x().whOutputStockLocId);

    const mtoToTransit = () =>
      [...store.rules.values()].filter(
        (rule) => rule.routeId === 'mto' && rule.locationSrcId === x().lotStockId && rule.locationDestId === 'transit',
      );
    const [firstMto] = mtoToTransit();
    expect(firstMto.active).toBe(false);

    update(store, supplier, { deliverySteps: 'SHIP_ONLY' });
    expect(store.rules.get(stockToOutput.id)?.active).toBe(false);
    expect(store.rules.get(toTransit.id)).toMatchObject({ locationSrcId: x().lotStockId, procureMethod: 'MAKE_TO_STOCK' });
    // Back to one step: a new Stock → transit make-to-order rule; the archived one stays archived.
    expect(mtoToTransit().map((rule) => [rule.id === firstMto.id, rule.active])).toEqual([
      [true, false],
      [false, true],
    ]);

    const back = update(store, supplier, { deliverySteps: 'PICK_SHIP' });
    expect(store.rules.get(stockToOutput.id)?.active).toBe(true);
    expect(back.ruleCreates.filter((rule) => rule.routeId === route.id)).toEqual([]);
  });

  it('brings back every archived route of a supplier added again', () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_A');
    reconcile(store, supplier, 'created');
    const id = addWarehouse(store, 'WH_B');
    reconcile(store, id, 'created');
    reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    store.routes.set('by-hand', {
      id: 'by-hand',
      name: 'WH_B: second route from WH_A',
      active: false,
      sequence: 0,
      productSelectable: true,
      productCategSelectable: true,
      warehouseSelectable: true,
      suppliedWhId: id,
      supplierWhId: supplier,
      warehouseIds: [],
    });
    reconcile(store, id, 'updated', { resupplyRemoved: [supplier] });

    const plan = reconcile(store, id, 'updated', { resupplyAdded: [supplier] });

    expect(plan.routeCreates).toEqual([]);
    expect([...store.routes.values()].filter((route) => route.supplierWhId === supplier).map((route) => route.active)).toEqual([true, true]);
  });

  it('makes a new Stock → transit make-to-order rule when a supplier goes back to one step, even with an old one active again', () => {
    const store = emptyStore();
    const supplier = addWarehouse(store, 'WH_X');
    reconcile(store, supplier, 'created');
    const id = addWarehouse(store, 'WH_Y');
    reconcile(store, id, 'created');
    reconcile(store, id, 'updated', { resupplyAdded: [supplier] });
    update(store, supplier, { deliverySteps: 'PICK_SHIP' });
    // Unarchiving the warehouse brings back every rule of the warehouse, the archived make-to-order rule too.
    update(store, supplier, { active: false });
    update(store, supplier, { active: true });

    update(store, supplier, { deliverySteps: 'SHIP_ONLY' });

    expect(routeRules(store, 'mto').filter((rule) => rule.startsWith('WH_X: Stock → Inter-warehouse transit'))).toEqual([
      'WH_X: Stock → Inter-warehouse transit (MTO) [active]',
      'WH_X: Stock → Inter-warehouse transit (MTO) [active]',
    ]);
  });
});
