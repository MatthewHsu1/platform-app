import { describe, expect, it } from 'vitest';

import { Stopped, makeFakeLotStock, quantRow } from 'src/stock/lot/__tests__/fakes/fake-lot-stock';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import { LOT_RELOCATED_REASON } from 'src/stock/utils/plan-lot-location.util';

// Lots a and b in A, c in B, each typed onto `typed` by a user before the run.
const threeLots = (typed: string) =>
  makeFakeLotStock(
    [quantRow('qa', 'A', 1, null, 'a'), quantRow('qb', 'A', 2, null, 'b'), quantRow('qc', 'B', 3, null, 'c')],
    { a: typed, b: typed, c: typed },
  );

const toShelf = (...lotIds: string[]) => lotIds.map((lotId) => ({ lotId, toLocationId: 'shelf' }));

// The daily job's resume of every stale claim, the lots' own claims before the batch's unless `batchFirst`.
const resumeStale = async (stock: ReturnType<typeof makeFakeLotStock>, { batchFirst = false } = {}) => {
  stock.claimStore.advanceMinutes(16);
  const keys = [...stock.claimStore.rows.keys()].sort();

  for (const key of batchFirst ? keys.reverse() : keys) {
    const [action, recordId] = key.split(':');

    if (action === 'relocateLot') {
      await stock.relocate.resumeRelocateLot(recordId);
    } else {
      await stock.batch.resumeRelocateLotBatch(recordId);
    }
  }
};

describe('relocateLotBatch', () => {
  it('moves three lots set to one shelf with one move of all their rows, and each lot shows the shelf', async () => {
    const stock = threeLots('shelf');

    const outcomes = await stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'));

    expect({
      outcomes: Object.fromEntries(outcomes),
      calls: stock.db.moveCalls,
      stock: stock.stockAt(),
      lots: stock.lotAt(),
      reasons: [...new Set(stock.db.moves.map((move) => move.reason))],
      claims: stock.claimStore.rows.size,
    }).toEqual({
      outcomes: { a: { kind: 'done' }, b: { kind: 'done' }, c: { kind: 'done' } },
      calls: [{ quantIds: ['qa', 'qb', 'qc'], to: 'shelf', unpack: false }],
      stock: ['qa@shelf', 'qb@shelf', 'qc@shelf'],
      lots: { a: 'shelf', b: 'shelf', c: 'shelf' },
      reasons: [LOT_RELOCATED_REASON],
      claims: 0,
    });
  });

  it('refuses a lot set to a virtual location and still moves the others', async () => {
    const stock = threeLots('shelf');

    const outcomes = await stock.batch.relocateLotBatch([{ lotId: 'a', toLocationId: 'WH' }, ...toShelf('b', 'c')]);

    expect({ outcomes: Object.fromEntries(outcomes), stock: stock.stockAt(), claims: stock.claimStore.rows.size }).toEqual({
      outcomes: {
        a: { kind: 'refused', reason: VIEW_LOCATION_REASON, values: { location: 'WH' } },
        b: { kind: 'done' },
        c: { kind: 'done' },
      },
      stock: ['qa@A', 'qb@shelf', 'qc@shelf'],
      claims: 0,
    });
  });

  it('answers held for a lot another run is moving and stale for a lot whose run stopped, and moves only the free lot', async () => {
    const stock = threeLots('shelf');
    const claim = (key: string, startedAt: string) =>
      stock.claimStore.rows.set(key, { id: key, key, runId: `run-${key}`, startedAt, finishedAt: null, progress: null });
    claim('relocateLot:a', stock.claimStore.store.now().toISOString());
    claim('relocateLot:b', '2026-10-08T09:00:00.000Z');

    const outcomes = await stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'));

    expect({ outcomes: Object.fromEntries(outcomes), stock: stock.stockAt(), claims: [...stock.claimStore.rows.keys()] }).toEqual({
      outcomes: { a: { kind: 'held' }, b: { kind: 'stale' }, c: { kind: 'done' } },
      stock: ['qa@A', 'qb@A', 'qc@shelf'],
      claims: ['relocateLot:a', 'relocateLot:b'],
    });
  });
});

describe('a stopped lot batch', () => {
  it('the daily resume finishes a batch stopped past its commit point: every lot of it moves, as a clean run leaves it', async () => {
    const clean = threeLots('shelf');
    await clean.batch.relocateLotBatch(toShelf('a', 'b', 'c'));

    const stopped = threeLots('shelf');
    stopped.db.stopAfter = 1;
    await expect(stopped.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    expect(stopped.stockAt()).toEqual(['qa@shelf', 'qb@A', 'qc@B']);

    await resumeStale(stopped);

    expect({ stock: stopped.stockAt(), lots: stopped.lotAt(), moves: stopped.db.moves, claims: stopped.claimStore.rows.size }).toEqual({
      stock: clean.stockAt(),
      lots: clean.lotAt(),
      moves: clean.db.moves,
      claims: 0,
    });
  });

  it('the daily resume finishes a stopped batch the same when it reaches the batch before its lots', async () => {
    const clean = threeLots('shelf');
    await clean.batch.relocateLotBatch(toShelf('a', 'b', 'c'));

    const stopped = threeLots('shelf');
    stopped.db.stopAfter = 1;
    await expect(stopped.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);

    await resumeStale(stopped, { batchFirst: true });

    expect({ stock: stopped.stockAt(), lots: stopped.lotAt(), moves: stopped.db.moves, claims: stopped.claimStore.rows.size }).toEqual({
      stock: clean.stockAt(),
      lots: clean.lotAt(),
      moves: clean.db.moves,
      claims: 0,
    });
  });

  it('the daily resume of a batch stopped before it stored its plan frees every lot, each showing where its stock is', async () => {
    const stock = threeLots('shelf');
    stock.faults.killAt = 'plan';
    await expect(stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    stock.faults.dead = false;

    await resumeStale(stock);

    expect({ stock: stock.stockAt(), lots: stock.lotAt(), moves: stock.db.moves, claims: stock.claimStore.rows.size }).toEqual({
      stock: ['qa@A', 'qb@A', 'qc@B'],
      lots: { a: 'A', b: 'A', c: 'B' },
      moves: [],
      claims: 0,
    });
  });

  it('the daily resume of a batch stopped before its commit point also gives a refused lot the location of its stock', async () => {
    const stock = makeFakeLotStock([quantRow('qa', 'A', 1, null, 'a'), quantRow('qb', 'A', 2, null, 'b')], { a: 'WH', b: 'shelf' });
    stock.faults.killAt = 'commit';
    await expect(
      stock.batch.relocateLotBatch([{ lotId: 'a', toLocationId: 'WH' }, { lotId: 'b', toLocationId: 'shelf' }]),
    ).rejects.toThrow(Stopped);
    stock.faults.dead = false;

    await resumeStale(stock, { batchFirst: true });

    expect({ lots: stock.lotAt(), moves: stock.db.moves, claims: stock.claimStore.rows.size }).toEqual({
      lots: { a: 'A', b: 'A' },
      moves: [],
      claims: 0,
    });
  });

  it('a lot without stock in a stopped batch keeps the location typed on it', async () => {
    const stock = makeFakeLotStock([quantRow('qs', 'A', 1, null, 'stocked')], { stocked: 'shelf', empty: 'shelf' });
    stock.faults.killAt = 'commit';
    await expect(stock.batch.relocateLotBatch(toShelf('stocked', 'empty'))).rejects.toThrow(Stopped);
    stock.faults.dead = false;

    await resumeStale(stock);

    expect({ lots: stock.lotAt(), claims: stock.claimStore.rows.size }).toEqual({ lots: { stocked: 'A', empty: 'shelf' }, claims: 0 });
  });

  it('a new edit of a lot whose stopped batch another run is finishing answers held and keeps the lot claimed', async () => {
    const stock = threeLots('shelf');
    stock.db.stopAfter = 1;
    await expect(stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    stock.claimStore.advanceMinutes(16);
    const batchKey = [...stock.claimStore.rows.keys()].find((key) => key.startsWith('relocateLotBatch:')) as string;
    const batchClaim = stock.claimStore.rows.get(batchKey);
    stock.claimStore.rows.set(batchKey, { ...(batchClaim as NonNullable<typeof batchClaim>), startedAt: stock.claimStore.store.now().toISOString() });

    expect(await stock.relocate.relocateLot('b', 'C')).toEqual({ kind: 'held' });

    expect({ moves: stock.db.moves.length, lotClaimed: stock.claimStore.rows.has('relocateLot:b') }).toEqual({ moves: 1, lotClaimed: true });
  });

  it('frees a lot a held edit took over once the batch is finished, as it frees the other lots of the batch', async () => {
    const clean = threeLots('shelf');
    await clean.batch.relocateLotBatch(toShelf('a', 'b', 'c'));

    const stock = threeLots('shelf');
    stock.db.stopAfter = 1;
    await expect(stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    stock.claimStore.advanceMinutes(16);
    const batchKey = [...stock.claimStore.rows.keys()].find((key) => key.startsWith('relocateLotBatch:')) as string;
    const batchClaim = stock.claimStore.rows.get(batchKey) as NonNullable<ReturnType<typeof stock.claimStore.rows.get>>;
    const stoppedAt = batchClaim.startedAt;
    stock.claimStore.rows.set(batchKey, { ...batchClaim, startedAt: stock.claimStore.store.now().toISOString() });
    expect(await stock.relocate.relocateLot('b', 'C')).toEqual({ kind: 'held' });
    stock.claimStore.rows.set(batchKey, { ...batchClaim, startedAt: stoppedAt });

    await stock.batch.resumeRelocateLotBatch(batchKey.split(':')[1]);

    expect({ stock: stock.stockAt(), lots: stock.lotAt(), claims: [...stock.claimStore.rows.keys()] }).toEqual({
      stock: clean.stockAt(),
      lots: clean.lotAt(),
      claims: [],
    });
  });

  it('the daily resume frees a batch stopped before its commit point: nothing moves and each lot shows where its stock is', async () => {
    const stock = threeLots('shelf');
    stock.faults.killAt = 'commit';
    await expect(stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    stock.faults.dead = false;
    expect(stock.claimStore.rows.size).toBe(4);

    await resumeStale(stock);

    expect({ stock: stock.stockAt(), lots: stock.lotAt(), moves: stock.db.moves, claims: stock.claimStore.rows.size }).toEqual({
      stock: ['qa@A', 'qb@A', 'qc@B'],
      lots: { a: 'A', b: 'A', c: 'B' },
      moves: [],
      claims: 0,
    });
  });

  it('a new edit of a lot whose batch stopped finishes that batch first, then moves the lot', async () => {
    const stock = threeLots('shelf');
    stock.db.stopAfter = 1;
    await expect(stock.batch.relocateLotBatch(toShelf('a', 'b', 'c'))).rejects.toThrow(Stopped);
    stock.claimStore.advanceMinutes(16);

    expect(await stock.relocate.relocateLot('b', 'C')).toEqual({ kind: 'done' });

    expect({ stock: stock.stockAt(), lots: stock.lotAt(), claims: stock.claimStore.rows.size }).toEqual({
      stock: ['qa@shelf', 'qb@C', 'qc@shelf'],
      lots: { a: 'shelf', b: 'C', c: 'shelf' },
      claims: 0,
    });
  });
});
