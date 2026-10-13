import { describe, expect, it } from 'vitest';

import { Stopped, makeFakeLotStock, quantRow } from 'src/stock/lot/__tests__/fakes/fake-lot-stock';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import { LOT_IN_SEVERAL_LOCATIONS, LOT_RELOCATED_REASON } from 'src/stock/utils/plan-lot-location.util';
import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

const KEY = 'relocateLot:lot';

// One lot, "lot", whose location is `lotLocationId` until a recompute.
const setup = (quants: QuantRow[], lotLocationId: string | null) => {
  const stock = makeFakeLotStock(quants, { lot: lotLocationId });
  const lot = () => stock.db.lots.get('lot') as { locationId: string | null; productQty: number | null };

  return { ...stock, lot };
};

const storedRun = (progress: ClaimProgress) => ({
  id: 'stopped',
  key: KEY,
  runId: 'stopped-run',
  startedAt: '2026-10-08T09:00:00.000Z',
  finishedAt: null,
  progress,
});

describe('relocateLot', () => {
  it('moves the stock of a lot in one location to the new location and the lot shows it', async () => {
    const { claimStore, db, relocate, stockAt, lot } = setup([quantRow('q1', 'A', 1)], 'A');

    expect(await relocate.relocateLot('lot', 'B')).toEqual({ kind: 'done' });

    expect({ stock: stockAt(), lot: lot(), moves: db.moves, claims: claimStore.rows.size }).toEqual({
      stock: ['q1@B'],
      lot: { locationId: 'B', productQty: 1 },
      moves: [{ quantId: 'q1', to: 'B', reason: LOT_RELOCATED_REASON }],
      claims: 0,
    });
  });

  it('refuses a lot that sits in several locations and moves nothing', async () => {
    const { claimStore, db, relocate } = setup([quantRow('q1', 'A', 1), quantRow('q2', 'C', 10)], null);

    expect(await relocate.relocateLot('lot', 'B')).toEqual({
      kind: 'refused',
      reason: LOT_IN_SEVERAL_LOCATIONS,
      values: {},
    });
    expect({ moves: db.moves, claims: claimStore.rows.size }).toEqual({ moves: [], claims: 0 });
  });

  it('refuses a virtual location, where no stock can be kept', async () => {
    const { db, relocate } = setup([quantRow('q1', 'A', 1)], 'A');

    expect(await relocate.relocateLot('lot', 'WH')).toEqual({
      kind: 'refused',
      reason: VIEW_LOCATION_REASON,
      values: { location: 'WH' },
    });
    expect(db.moves).toEqual([]);
  });

  it('clearing the location moves the stock where it is, and the lot shows that location again', async () => {
    const { db, relocate, stockAt, lot } = setup([quantRow('q1', 'A', 1)], null);

    expect(await relocate.relocateLot('lot', null)).toEqual({ kind: 'done' });

    expect({ stock: stockAt(), lot: lot().locationId, moves: db.moves }).toEqual({
      stock: ['q1@A'],
      lot: 'A',
      moves: [{ quantId: 'q1', to: 'A', reason: LOT_RELOCATED_REASON }],
    });
  });

  it('takes the lot out of a package that holds other stock too, and leaves it in a package of its own', async () => {
    const shared = setup([{ ...quantRow('q1', 'A', 1), packageId: 'box' }], 'A');
    shared.db.packageQuantCounts.set('box', 2);
    const own = setup([{ ...quantRow('q1', 'A', 1), packageId: 'box' }], 'A');
    own.db.packageQuantCounts.set('box', 1);

    await shared.relocate.relocateLot('lot', 'B');
    await own.relocate.relocateLot('lot', 'B');

    expect({ shared: shared.db.unpacked, own: own.db.unpacked }).toEqual({ shared: [true], own: [false] });
  });

  it('a second delivery of the same edit moves nothing', async () => {
    const moved = setup([quantRow('q1', 'A', 1)], 'B');
    await moved.relocate.relocateLot('lot', 'B');
    await moved.relocate.relocateLot('lot', 'B');

    const cleared = setup([quantRow('q1', 'A', 1)], null);
    await cleared.relocate.relocateLot('lot', null);
    await cleared.relocate.relocateLot('lot', null);

    expect({ moved: moved.db.moves.map((move) => move.to), cleared: cleared.db.moves.map((move) => move.to) }).toEqual({
      moved: ['B'],
      cleared: ['A'],
    });
  });

  it('keeps the location typed on a lot with no stock', async () => {
    const { db, relocate, lot } = setup([], 'B');

    expect(await relocate.relocateLot('lot', 'B')).toEqual({ kind: 'done' });

    expect({ lot: lot().locationId, moves: db.moves }).toEqual({ lot: 'B', moves: [] });
  });

  it('answers held while another run moves the lot', async () => {
    const { claimStore, db, relocate } = setup([quantRow('q1', 'A', 1)], 'A');
    claimStore.rows.set(KEY, { ...storedRun({ steps: {} }), startedAt: claimStore.store.now().toISOString() });

    expect(await relocate.relocateLot('lot', 'B')).toEqual({ kind: 'held' });
    expect(db.moves).toEqual([]);
  });
});

describe('relocateLot after a stopped run', () => {
  it('the daily resume finishes a move stopped half way: each row moved once, as a clean run leaves it', async () => {
    const clean = setup([quantRow('q1', 'A', 4), quantRow('q2', 'A', 6, 'owner')], 'A');
    await clean.relocate.relocateLot('lot', 'B');

    const stopped = setup([quantRow('q1', 'A', 4), quantRow('q2', 'A', 6, 'owner')], 'A');
    stopped.db.stopAfter = 1;
    await expect(stopped.relocate.relocateLot('lot', 'B')).rejects.toThrow(Stopped);
    expect({ stock: stopped.stockAt(), held: stopped.claimStore.rows.has(KEY) }).toEqual({
      stock: ['q1@B', 'q2@A'],
      held: true,
    });

    stopped.claimStore.advanceMinutes(16);
    await stopped.relocate.resumeRelocateLot('lot');

    expect({
      stock: stopped.stockAt(),
      lot: stopped.lot(),
      moves: stopped.db.moves,
      claims: stopped.claimStore.rows.size,
    }).toEqual({ stock: clean.stockAt(), lot: clean.lot(), moves: clean.db.moves, claims: 0 });
  });

  it('the daily resume frees a run that stopped before its commit point: nothing moves and the lot shows where its stock is', async () => {
    const { claimStore, db, relocate, stockAt, lot } = setup([quantRow('q1', 'A', 1)], 'B');
    claimStore.rows.set(
      KEY,
      storedRun({
        steps: {
          'relocateLot:plan': { plan: { kind: 'move', quantIds: ['q1'], unpack: false, toLocationId: 'B' }, done: true },
        },
      }),
    );

    await relocate.resumeRelocateLot('lot');

    expect({ stock: stockAt(), lot: lot().locationId, moves: db.moves, claims: claimStore.rows.size }).toEqual({
      stock: ['q1@A'],
      lot: 'A',
      moves: [],
      claims: 0,
    });
  });

  it('a new edit that takes over a stopped move finishes it first, then makes its own', async () => {
    const { claimStore, db, relocate, stockAt, lot } = setup([quantRow('q1', 'A', 1)], 'C');
    claimStore.rows.set(
      KEY,
      storedRun({
        committed: true,
        steps: {
          'relocateLot:plan': { plan: { kind: 'move', quantIds: ['q1'], unpack: false, toLocationId: 'B' }, done: true },
        },
      }),
    );

    expect(await relocate.relocateLot('lot', 'C')).toEqual({ kind: 'done' });

    expect({ stock: stockAt(), lot: lot().locationId, moves: db.moves.map((move) => move.to), claims: claimStore.rows.size }).toEqual({
      stock: ['q1@C'],
      lot: 'C',
      moves: ['B', 'C'],
      claims: 0,
    });
  });
});
