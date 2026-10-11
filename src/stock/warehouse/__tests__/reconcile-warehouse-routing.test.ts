import { describe, expect, it } from 'vitest';

import { makeReconcileWarehouseRouting } from 'src/stock/warehouse/reconcile-warehouse-routing';
import { makeFakeRoutingStore } from 'src/stock/warehouse/__tests__/fakes/fake-routing-store';
import { type RoutingWarehouseRecord } from 'src/stock/warehouse/types/routing-warehouse-record.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';

type Fake = ReturnType<typeof makeFakeRoutingStore>;
type Step = (fake: Fake) => { warehouseId: string; event: WarehouseEvent; change?: WarehouseChange };

const run = (fake: Fake, { warehouseId, event, change }: ReturnType<Step>) =>
  makeReconcileWarehouseRouting(fake.store)(warehouseId, event, change);

// WH_X ships in one step and resupplies WH_Y.
const createX: Step = (fake) => ({ warehouseId: fake.addWarehouse('WH_X'), event: 'created' });
const createY: Step = (fake) => {
  const warehouseId = fake.addWarehouse('WH_Y');
  fake.linkResupply(warehouseId, 'wh-WH_X');
  return { warehouseId, event: 'created' };
};
// Staff save the warehouse; the request carries the values it had before.
const save =
  (warehouseId: string, values: Partial<Pick<RoutingWarehouseRecord, 'name' | 'active' | 'receptionSteps' | 'deliverySteps'>>): Step =>
  (fake) => {
    const warehouse = fake.warehouse(warehouseId);
    const before = {
      name: warehouse.name,
      code: warehouse.code,
      receptionSteps: warehouse.receptionSteps!,
      deliverySteps: warehouse.deliverySteps!,
      active: warehouse.active!,
    };
    Object.assign(warehouse, values);
    const event: WarehouseEvent = values.active === false ? 'archived' : values.active === true ? 'unarchived' : 'updated';
    return { warehouseId, event, change: { before } };
  };

// WH_Y has no reception route at all, as a warehouse made before routes existed; a change of its
// delivery steps alone makes that route and its rules again.
const loseReceptionThenSwitchDelivery: Step = (fake) => {
  const warehouse = fake.warehouse('wh-WH_Y');
  const routeId = warehouse.receptionRouteId!;
  fake.rules().filter((rule) => rule.routeId === routeId).forEach((rule) => fake.remove('rules', rule.id));
  fake.links().filter((link) => link.routeId === routeId).forEach((link) => fake.remove('links', link.id));
  fake.remove('routes', routeId);
  warehouse.receptionRouteId = null;
  return save('wh-WH_Y', { deliverySteps: 'PICK_SHIP' })(fake);
};

const STEPS: Step[] = [
  createX,
  createY,
  save('wh-WH_X', { deliverySteps: 'PICK_PACK_SHIP' }),
  // Back to one step makes a new Stock → transit make-to-order rule, once per request.
  save('wh-WH_X', { deliverySteps: 'SHIP_ONLY' }),
  save('wh-WH_X', { active: false }),
  save('wh-WH_X', { active: true }),
  save('wh-WH_Y', { receptionSteps: 'THREE_STEPS' }),
  () => ({ warehouseId: 'wh-WH_Y', event: 'updated', change: { resupplyRemoved: ['wh-WH_X'] } }),
  () => ({ warehouseId: 'wh-WH_Y', event: 'updated', change: { resupplyAdded: ['wh-WH_X'] } }),
  loseReceptionThenSwitchDelivery,
  // Last, so no later rebuild of the route names hides a name renamed twice. The new name holds the old one.
  save('wh-WH_X', { name: 'Warehouse WH_X North' }),
];

// Each step is one request: a run of it that stopped runs again under the same name.
const requestOf = (fake: Fake, step: Step, index: number) => {
  const request = step(fake);
  return { ...request, change: { ...request.change, requestId: `request-${index}` } };
};

const cleanRun = async (steps: Step[]) => {
  const fake = makeFakeRoutingStore();
  for (const [index, step] of steps.entries()) {
    await run(fake, requestOf(fake, step, index));
  }
  return fake;
};

const ruleNames = (fake: Fake) =>
  fake
    .rules()
    .map((rule) => `${rule.name} [${rule.active ? 'active' : 'archived'}]`)
    .sort();

describe('reconcileWarehouseRouting', () => {
  it('makes the routes and rules of two warehouses, one resupplying the other', async () => {
    const fake = await cleanRun([createX, createY]);

    expect(ruleNames(fake)).toEqual([
      'WH_X: Stock → Customers (MTO) [active]',
      'WH_X: Stock → Customers [active]',
      'WH_X: Stock → Inter-warehouse transit (MTO) [active]',
      'WH_X: Stock → Inter-warehouse transit [active]',
      'WH_X: Vendors → Stock [active]',
      'WH_Y: Inter-warehouse transit → Stock [active]',
      'WH_Y: Stock → Customers (MTO) [active]',
      'WH_Y: Stock → Customers [active]',
      'WH_Y: Vendors → Stock [active]',
    ]);
    const y = fake.warehouse('wh-WH_Y');
    expect(
      fake
        .links()
        .filter((link) => link.warehouseId === y.id)
        .map((link) => link.routeId)
        .sort(),
    ).toEqual([y.receptionRouteId, y.deliveryRouteId].sort());
    expect(fake.snapshot().locations.find(([id]) => id === 'transit')?.[1].active).toBe(true);
  });

  it('makes a missing reception route and its rules again when only the delivery steps change', async () => {
    const fake = await cleanRun(STEPS);
    const y = fake.warehouse('wh-WH_Y');

    expect(
      fake
        .rules()
        .filter((rule) => rule.routeId !== null && rule.routeId === y.receptionRouteId)
        .map((rule) => `${rule.name} [${rule.active ? 'active' : 'archived'}]`)
        .sort(),
    ).toEqual([
      'WH_Y: Input → Quality Control [active]',
      'WH_Y: Quality Control → Stock [active]',
      'WH_Y: Vendors → Stock [active]',
    ]);
    expect(fake.links().some((link) => link.routeId === y.receptionRouteId && link.warehouseId === y.id)).toBe(true);
  });

  it('writes nothing on a second run with nothing changed', async () => {
    const fake = await cleanRun(STEPS);
    const writes = fake.state.writes;

    await run(fake, { warehouseId: 'wh-WH_X', event: 'updated' });
    await run(fake, { warehouseId: 'wh-WH_Y', event: 'updated' });
    await run(fake, { warehouseId: 'wh-WH_Y', event: 'created' });

    expect(fake.state.writes).toBe(writes);
  });

  it('leaves the same rows as a clean run when any step stops at any write and runs again', async () => {
    const clean = await cleanRun(STEPS);
    const expected = clean.snapshot();
    const writesPerStep: number[] = [];
    const counter = makeFakeRoutingStore();
    for (const [index, step] of STEPS.entries()) {
      const before = counter.state.writes;
      await run(counter, requestOf(counter, step, index));
      writesPerStep.push(counter.state.writes - before);
    }

    for (const [stoppedStep, writes] of writesPerStep.entries()) {
      // One past the last write: the run finished but stopped before it could say so, and runs again.
      for (let stopAt = 1; stopAt <= writes + 1; stopAt += 1) {
        const fake = makeFakeRoutingStore();
        for (const [index, step] of STEPS.entries()) {
          const request = requestOf(fake, step, index);
          if (index === stoppedStep && stopAt <= writes) {
            fake.state.stopAtWrite = fake.state.writes + stopAt;
            await expect(run(fake, request)).rejects.toThrow('stopped');
            fake.state.stopAtWrite = undefined;
          } else if (index === stoppedStep) {
            await run(fake, request);
          }
          await run(fake, request);
        }
        expect(fake.snapshot(), `step ${stoppedStep + 1} stopped at write ${stopAt}`).toEqual(expected);
      }
    }
  });

  it('brings back a trashed delivery route, the rules it wants and its warehouse link when the delivery steps change', async () => {
    const switchSteps = save('wh-WH_X', { deliverySteps: 'PICK_SHIP' });
    const expected = (await cleanRun([createX, switchSteps])).snapshot();
    const fake = await cleanRun([createX]);
    const routeId = fake.warehouse('wh-WH_X').deliveryRouteId!;
    fake.trash('routes', routeId);
    fake.rules().filter((rule) => rule.routeId === routeId).forEach((rule) => fake.trash('rules', rule.id));
    fake.links().filter((link) => link.routeId === routeId).forEach((link) => fake.trash('links', link.id));

    await run(fake, requestOf(fake, switchSteps, 1));

    // The one-step rule the new steps do not want stays in the trash.
    const wanted = (snapshot: typeof expected) => ({
      warehouses: snapshot.warehouses,
      routes: snapshot.routes,
      links: snapshot.links,
      rules: snapshot.rules.filter((rule) => rule.active && rule.deletedAt === null),
    });
    expect(wanted(fake.snapshot())).toEqual(wanted(expected));
  });
});
