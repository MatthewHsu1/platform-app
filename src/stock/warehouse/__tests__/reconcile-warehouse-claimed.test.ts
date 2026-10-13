import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeFakeWarehouseStore } from 'src/stock/warehouse/__tests__/fakes/fake-warehouse-store';
import { makeReconcileWarehouse } from 'src/stock/warehouse/reconcile-warehouse';
import { makeReconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';

const KEY = 'reconcile:w1';

// Another run holds the warehouse until `wait` has been called `heldRounds` times.
const setup = (heldRounds: number) => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(claimStore.store);
  const calls = { attempts: 0, waits: [] as number[] };

  if (heldRounds > 0) {
    claimStore.rows.set(KEY, {
      id: 'other',
      key: KEY,
      runId: 'other-run',
      startedAt: claimStore.store.now().toISOString(),
      finishedAt: null,
      progress: null,
    });
  }
  const runClaimed: Parameters<typeof makeReconcileWarehouseClaimed>[0]['runClaimed'] = (key, run) => {
    calls.attempts += 1;

    return claims.withClaim(key, run);
  };
  const wait = async (ms: number) => {
    calls.waits.push(ms);
    if (calls.waits.length >= heldRounds) {
      claimStore.rows.delete(KEY);
    }
  };

  return { claimStore, calls, runClaimed, openJournal: claims.openJournal, wait };
};

describe('reconcileWarehouseClaimed', () => {
  it('waits while another run holds the warehouse, then reconciles once and frees the claim', async () => {
    const { claimStore, calls, runClaimed, openJournal, wait } = setup(2);
    const reconciled: string[] = [];
    const { reconcileWarehouseClaimed: reconcile } = makeReconcileWarehouseClaimed({
      runClaimed,
      openJournal,
      reconcile: async (warehouseId, event) => {
        reconciled.push(`${warehouseId}:${event}`);
        expect(claimStore.rows.get(KEY)?.runId).toBe('run-3');
      },
      wait,
    });

    await reconcile('w1', 'updated');

    expect({ reconciled, waits: calls.waits, attempts: calls.attempts, rows: claimStore.rows.size }).toEqual({
      reconciled: ['w1:updated'],
      waits: [3_000, 3_000],
      attempts: 3,
      rows: 0,
    });
  });

  it('frees the claim and passes the error on when the reconciler fails', async () => {
    const { claimStore, runClaimed, openJournal, wait } = setup(0);
    const { reconcileWarehouseClaimed: reconcile } = makeReconcileWarehouseClaimed({
      runClaimed,
      openJournal,
      reconcile: async () => {
        throw new Error("You can't disable locations WH/Input because they still contain products.");
      },
      wait,
    });

    await expect(reconcile('w1', 'updated')).rejects.toThrow('still contain products');
    expect(claimStore.rows.size).toBe(0);
  });

  it('gives up after ten held rounds', async () => {
    const { calls, runClaimed, openJournal, wait } = setup(100);
    const { reconcileWarehouseClaimed: reconcile } = makeReconcileWarehouseClaimed({
      runClaimed,
      openJournal,
      reconcile: async () => {},
      wait,
    });

    await expect(reconcile('w1', 'created')).rejects.toThrow('Another run is still updating warehouse w1');
    expect({ attempts: calls.attempts, waits: calls.waits.length }).toEqual({ attempts: 10, waits: 9 });
  });
});

const NEW_WAREHOUSE = {
  id: 'w1',
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
const ARCHIVE_CHANGE = {
  before: { name: 'Chicago', code: 'chic', receptionSteps: 'ONE_STEP' as const, deliverySteps: 'SHIP_ONLY' as const, active: true },
};

// A stop is the process dying: after the stopped write nothing more reaches the claim row.
const stoppable = (store: ClaimStore, stopped: () => boolean): ClaimStore => ({
  ...store,
  updateWhere: async (match, data) => {
    if (stopped()) {
      throw new Error('process stopped');
    }
    return store.updateWhere(match, data);
  },
  destroy: async (match) => {
    if (stopped()) {
      throw new Error('process stopped');
    }
    return store.destroy(match);
  },
});

// A warehouse made by a clean run, then archived by staff; `stopAtArchiveWrite` stops the archive run at that write.
const archiveSetup = async (stopAtArchiveWrite?: number) => {
  const warehouses = makeFakeWarehouseStore({ warehouse: NEW_WAREHOUSE });
  const reconcile = makeReconcileWarehouse({ refuseLocationArchive: async () => null, store: warehouses.store });
  await reconcile('w1', 'created');
  warehouses.state.warehouse = { ...warehouses.state.warehouse, active: false };

  const claimStore = makeFakeClaimStore();
  let stopped = false;
  if (stopAtArchiveWrite !== undefined) {
    warehouses.state.stopAtWrite = warehouses.state.writes + stopAtArchiveWrite;
  }
  const { withClaim, openJournal } = makeClaims(
    stoppable(claimStore.store, () => {
      stopped = stopped || (warehouses.state.stopAtWrite !== undefined && warehouses.state.writes >= warehouses.state.stopAtWrite);
      return stopped;
    }),
  );
  const claimed = makeReconcileWarehouseClaimed({ runClaimed: withClaim, openJournal, reconcile, wait: async () => {} });

  return { warehouses, claimStore, claimed };
};

describe('reconcileWarehouseClaimed after a stopped run', () => {
  it('the daily job finishes a stopped archive from its stored request: the same rows as a clean archive', async () => {
    const clean = await archiveSetup();
    await clean.claimed.reconcileWarehouseClaimed('w1', 'archived', ARCHIVE_CHANGE);
    const expected = clean.warehouses.snapshot();

    const stopped = await archiveSetup(1);
    await expect(stopped.claimed.reconcileWarehouseClaimed('w1', 'archived', ARCHIVE_CHANGE)).rejects.toThrow();
    expect(stopped.claimStore.rows.has(KEY)).toBe(true);

    stopped.warehouses.state.stopAtWrite = undefined;
    stopped.claimStore.advanceMinutes(16);
    const { withClaim, openJournal } = makeClaims(stopped.claimStore.store);
    const reconcile = makeReconcileWarehouse({ refuseLocationArchive: async () => null, store: stopped.warehouses.store });
    await makeReconcileWarehouseClaimed({ runClaimed: withClaim, openJournal, reconcile, wait: async () => {} }).resumeReconcile('w1');

    expect(stopped.warehouses.snapshot()).toEqual(expected);
    expect(stopped.claimStore.rows.has(KEY)).toBe(false);
  });

  it('frees a claim with no stored request and reconciles nothing', async () => {
    const claimStore = makeFakeClaimStore();
    const { withClaim, openJournal } = makeClaims(claimStore.store);
    claimStore.rows.set(KEY, {
      id: 'stopped',
      key: KEY,
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      finishedAt: null,
      progress: null,
    });
    const reconciled: string[] = [];
    const { resumeReconcile } = makeReconcileWarehouseClaimed({
      runClaimed: withClaim,
      openJournal,
      reconcile: async (warehouseId, event) => {
        reconciled.push(`${warehouseId}:${event}`);
      },
      wait: async () => {},
    });

    await resumeReconcile('w1');

    expect({ reconciled, rows: claimStore.rows.size }).toEqual({ reconciled: [], rows: 0 });
  });

  it('a new event that takes over a stopped run finishes the stored request first, then its own', async () => {
    const claimStore = makeFakeClaimStore();
    const { withClaim, openJournal } = makeClaims(claimStore.store);
    claimStore.rows.set(KEY, {
      id: 'stopped',
      key: KEY,
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      finishedAt: null,
      progress: { steps: { 'reconcile:request': { plan: { event: 'archived', change: {} }, done: false } } },
    });
    const reconciled: string[] = [];
    const { reconcileWarehouseClaimed } = makeReconcileWarehouseClaimed({
      runClaimed: withClaim,
      openJournal,
      reconcile: async (warehouseId, event) => {
        reconciled.push(`${warehouseId}:${event}`);
      },
      wait: async () => {},
    });

    await reconcileWarehouseClaimed('w1', 'unarchived');

    expect({ reconciled, rows: claimStore.rows.size }).toEqual({ reconciled: ['w1:archived', 'w1:unarchived'], rows: 0 });
  });
});

describe('reconcileWarehouseClaimed: the request name', () => {
  it('names a request by its run, and a stopped request runs again under the name it stored', async () => {
    const claimStore = makeFakeClaimStore();
    const { withClaim, openJournal } = makeClaims(claimStore.store);
    claimStore.rows.set(KEY, {
      id: 'stopped',
      key: KEY,
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      finishedAt: null,
      progress: {
        steps: { 'reconcile:request': { plan: { event: 'updated', change: { requestId: 'stopped-run' } }, done: false } },
      },
    });
    const requests: (string | undefined)[] = [];
    const { reconcileWarehouseClaimed } = makeReconcileWarehouseClaimed({
      runClaimed: withClaim,
      openJournal,
      reconcile: async (_warehouseId, _event, change) => {
        requests.push(change?.requestId);
      },
      wait: async () => {},
    });

    await reconcileWarehouseClaimed('w1', 'updated', { resupplyAdded: ['w2'] });

    expect(requests).toHaveLength(2);
    expect(requests[0]).toBe('stopped-run');
    expect(requests[1]).toEqual(expect.any(String));
    expect(requests[1]).not.toBe('stopped-run');
  });
});
