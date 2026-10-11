import { describe, expect, it } from 'vitest';

import { makeFakeWarehouseStore } from 'src/stock/warehouse/__tests__/fakes/fake-warehouse-store';
import { makeReconcileWarehouse } from 'src/stock/warehouse/reconcile-warehouse';

const NEW_WAREHOUSE = {
  id: 'w',
  name: 'Chicago',
  code: 'chic',
  active: true,
  receptionSteps: 'ONE_STEP' as const,
  deliverySteps: 'SHIP_ONLY' as const,
  viewLocationId: null,
  lotStockId: null,
  whInputStockLocId: null,
  whQcStockLocId: null,
  whOutputStockLocId: null,
  whPackStockLocId: null,
  inTypeId: null,
  outTypeId: null,
  intTypeId: null,
  pickTypeId: null,
  packTypeId: null,
  qcTypeId: null,
  storeTypeId: null,
  xdockTypeId: null,
};

const allowAll = async () => null;

const cleanRun = async () => {
  const fake = makeFakeWarehouseStore({ warehouse: NEW_WAREHOUSE });
  await makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store })('w', 'created');

  return fake;
};

describe('reconcileWarehouse: a new warehouse', () => {
  it('makes 6 locations, 8 sequences and 8 operation types, each role id on the warehouse', async () => {
    const { snapshot } = await cleanRun();
    const { warehouse, locations, sequences, types } = snapshot();

    expect(locations.filter((row) => row.id !== 'vendors' && row.id !== 'customers')).toHaveLength(6);
    expect(sequences).toHaveLength(8);
    expect(types).toHaveLength(8);
    expect(warehouse.viewLocationId).toBeTruthy();
    expect(warehouse.xdockTypeId).toBeTruthy();
  });

  it('runs the location recompute on the view location', async () => {
    const { state, snapshot } = await cleanRun();

    expect(state.recomputed).toEqual([[snapshot().warehouse.viewLocationId]]);
  });

  it('writes nothing on a second run', async () => {
    const fake = await cleanRun();
    const before = JSON.stringify(fake.snapshot());
    const writes = fake.state.writes;
    await makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store })('w', 'updated');

    expect(fake.state.writes).toBe(writes);
    expect(JSON.stringify(fake.snapshot())).toBe(before);
  });
});

describe('reconcileWarehouse: automatic batches on receipts and deliveries', () => {
  const INSTALL_WAREHOUSE = { ...NEW_WAREHOUSE, seedKey: 'stock.warehouse0' };
  const typeOf = (fake: ReturnType<typeof makeFakeWarehouseStore>, field: 'inTypeId' | 'outTypeId') =>
    fake.snapshot().types.find((row) => row.id === fake.state.warehouse[field]);

  it('leaves batching off on the operation types the install makes for its warehouse', async () => {
    const fake = makeFakeWarehouseStore({ warehouse: INSTALL_WAREHOUSE });
    await makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store })('w', 'created');

    expect(typeOf(fake, 'inTypeId')?.autoBatch).toBeUndefined();
    expect(typeOf(fake, 'outTypeId')?.autoBatch).toBeUndefined();
  });

  it('turns batching on for a receipt type of the install warehouse made again after its delete', async () => {
    const fake = makeFakeWarehouseStore({ warehouse: INSTALL_WAREHOUSE });
    const reconcile = makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store });
    await reconcile('w', 'created');
    fake.destroy('types', fake.state.warehouse.inTypeId as string);
    fake.state.warehouse = { ...fake.state.warehouse, inTypeId: null };

    await reconcile('w', 'updated');

    expect(typeOf(fake, 'inTypeId')).toMatchObject({ autoBatch: true, batchGroupByPartner: true });
    expect(typeOf(fake, 'outTypeId')?.autoBatch).toBeUndefined();
  });
});

describe('reconcileWarehouse: a run that stops at any write', () => {
  it('leaves the same rows as a clean run once it runs again, with no copy', async () => {
    const clean = await cleanRun();
    const expected = clean.snapshot();
    const totalWrites = clean.state.writes;

    for (let stopAt = 1; stopAt <= totalWrites; stopAt += 1) {
      const fake = makeFakeWarehouseStore({ warehouse: NEW_WAREHOUSE, stopAtWrite: stopAt });
      const reconcile = makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store });

      await expect(reconcile('w', 'created')).rejects.toThrow('stopped');
      await reconcile('w', 'created');

      const result = fake.snapshot();
      expect(result, `stopped at write ${stopAt}`).toEqual(expected);
      expect(result.sequences.some((row) => String(row.name).includes('(copy)'))).toBe(false);
    }
  });
});

describe('reconcileWarehouse: failures and refusals', () => {
  it('lets an error that is not a refusal out, with no note and no put back', async () => {
    const fake = makeFakeWarehouseStore({ warehouse: NEW_WAREHOUSE, stopAtWrite: 2 });

    await expect(makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store })('w', 'created')).rejects.toThrow('stopped');
    expect(fake.state.notes).toEqual([]);
    expect(fake.state.putBacks).toEqual([]);
  });

  it('puts the steps and the active flag back when a location to archive holds stock, writing nothing', async () => {
    const fake = await cleanRun();
    fake.state.warehouse = { ...fake.state.warehouse, active: false };
    const writes = fake.state.writes;
    const reconcile = makeReconcileWarehouse({ refuseLocationArchive: async () => 'Stock is still in WH/Stock.', store: fake.store });

    await reconcile('w', 'archived', {
      before: { name: 'Chicago', code: 'chic', receptionSteps: 'ONE_STEP', deliverySteps: 'SHIP_ONLY', active: true },
    });

    expect(fake.state.writes).toBe(writes);
    expect(fake.state.putBacks).toEqual([
      { receptionSteps: 'ONE_STEP', deliverySteps: 'SHIP_ONLY', active: true, reason: 'Stock is still in WH/Stock.' },
    ]);
  });

  it('only notes the refusal when nothing the staff changed can go back', async () => {
    const fake = await cleanRun();
    fake.state.warehouse = { ...fake.state.warehouse, active: false };
    const reconcile = makeReconcileWarehouse({ refuseLocationArchive: async () => 'Stock is still in WH/Stock.', store: fake.store });

    await reconcile('w', 'archived');

    expect(fake.state.putBacks).toEqual([]);
    expect(fake.state.notes).toEqual(['Warehouse not updated: Stock is still in WH/Stock.']);
  });

  it('runs the location recompute after a rename', async () => {
    const fake = await cleanRun();
    fake.state.warehouse = { ...fake.state.warehouse, code: 'CH' };
    fake.state.recomputed.length = 0;
    await makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store })('w', 'updated', {
      before: { name: 'Chicago', code: 'chic', receptionSteps: 'ONE_STEP', deliverySteps: 'SHIP_ONLY' },
    });

    expect(fake.state.recomputed).toHaveLength(1);
  });
});

describe('reconcileWarehouse: a role row staff moved to the trash', () => {
  const rowsOf = (snapshot: ReturnType<Awaited<ReturnType<typeof cleanRun>>['snapshot']>) => ({
    locations: snapshot.locations,
    sequences: snapshot.sequences,
    types: snapshot.types,
  });
  const withoutDeletedAt = (rows: Record<string, unknown>[]) => rows.map(({ deletedAt: _deletedAt, ...rest }) => rest);

  for (const table of ['locations', 'types', 'sequences'] as const) {
    it(`brings a trashed ${table} row back, then writes nothing`, async () => {
      const fake = await cleanRun();
      const expected = fake.snapshot();
      const trashedId = expected[table].find((row) => row.id !== 'vendors' && row.id !== 'customers')!.id;
      fake.trash(table, trashedId);
      const reconcile = makeReconcileWarehouse({ refuseLocationArchive: allowAll, store: fake.store });

      await reconcile('w', 'updated');

      const restored = fake.snapshot()[table].find((row) => row.id === trashedId)!;
      expect(restored.deletedAt).toBeNull();
      expect(withoutDeletedAt(fake.snapshot()[table])).toEqual(withoutDeletedAt(expected[table]));
      expect(fake.snapshot().warehouse).toEqual(expected.warehouse);

      const writes = fake.state.writes;
      await reconcile('w', 'updated');
      expect(fake.state.writes).toBe(writes);
      expect(rowsOf(fake.snapshot())[table]).toHaveLength(expected[table].length);
    });
  }
});

describe('reconcileWarehouse: routes and rules', () => {
  it('builds them after its own writes, with the same event and change', async () => {
    const fake = makeFakeWarehouseStore({ warehouse: NEW_WAREHOUSE });
    const calls: unknown[] = [];
    const reconcile = makeReconcileWarehouse({
      refuseLocationArchive: allowAll,
      store: fake.store,
      reconcileRouting: async (warehouseId, event, change) => {
        const { warehouse } = fake.snapshot();
        calls.push({ warehouseId, event, change, typesMade: warehouse.outTypeId !== null && warehouse.pickTypeId !== null });
      },
    });

    await reconcile('w', 'created', { resupplyAdded: ['s'] });

    expect(calls).toEqual([{ warehouseId: 'w', event: 'created', change: { resupplyAdded: ['s'] }, typesMade: true }]);
  });
});
