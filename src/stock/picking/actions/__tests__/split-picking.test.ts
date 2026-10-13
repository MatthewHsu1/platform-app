import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { CrashError, FakeStockDb, runIntoCrash } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makeSplitMoves } from 'src/stock/move/actions/split-moves';
import { makeCreateBackorder } from 'src/stock/picking/actions/create-backorder';
import { makeSplitPicking } from 'src/stock/picking/actions/split-picking';
import { StockUserError } from 'src/stock/stock-errors';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';

// Claim rows are writes too: a crash can follow any of them, and a crashed server writes nothing more.
const countClaimWrites = (store: ClaimStore, db: FakeStockDb): ClaimStore => {
  const alive = () => {
    if (db.crashed) {
      throw new CrashError(db.writeCount);
    }
  };

  return {
    ...store,
    create: async (row) => {
      alive();
      return store.create(row);
    },
    updateWhere: async (where, data) => {
      alive();
      const updated = await store.updateWhere(where, data);
      if (updated) {
        db.wrote('claim', [where.key]);
      }
      return updated;
    },
    destroy: async (where) => {
      alive();
      await store.destroy(where);
      db.wrote('claim', [where.key]);
    },
  };
};

// A delivery of 10 with 4 reserved, and a second product with nothing reserved.
const build = (filled = 4) => {
  const db = new FakeStockDb();
  db.addPicking({ id: 'out', name: 'WH/OUT/00100' });
  db.addMove({ id: 'm1', productId: 'P', productUomQty: 10, state: 'PARTIALLY_AVAILABLE', pickingId: 'out' });
  if (filled > 0) {
    db.addLine({ id: 'l1', moveId: 'm1', quantity: filled });
  }
  db.addMove({ id: 'm2', productId: 'Q', productUomQty: 3, state: 'CONFIRMED', pickingId: 'out' });

  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(countClaimWrites(claimStore.store, db));
  const { splitPicking, resumeSplit } = makeSplitPicking({
    digits: () => 2,
    readSplitSource: async (pickingId) => {
      const picking = db.pickings.get(pickingId);

      return picking === undefined
        ? null
        : {
            name: picking.name,
            moves: [...db.moves.values()]
              .filter((move) => move.pickingId === pickingId)
              .map((move) => ({
                id: move.id,
                state: move.state,
                productUomQty: move.productUomQty,
                quantity: [...db.lines.values()]
                  .filter((line) => line.moveId === move.id)
                  .reduce((sum, line) => sum + line.quantity, 0),
              })),
          };
    },
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    splitMoves: makeSplitMoves(db),
    createBackorder: makeCreateBackorder(db),
  });

  return { db, claims, claimStore, splitPicking, resumeSplit };
};

const movesOf = (db: FakeStockDb, pickingId: string) =>
  [...db.moves.values()]
    .filter((move) => move.pickingId === pickingId)
    .map((move) => `${move.productId}:${move.productUomQty}`)
    .sort();

describe('splitPicking', () => {
  it('keeps the filled 4 of a demand of 10 and sends the other 6 to a backorder', async () => {
    const run = build();

    const { backorderId } = await run.splitPicking(['out']);

    expect(backorderId).not.toBeNull();
    expect(movesOf(run.db, 'out')).toEqual(['P:4']);
    expect(movesOf(run.db, backorderId ?? '')).toEqual(['P:6', 'Q:3']);
    expect(run.db.pickings.get(backorderId ?? '')?.backorderId).toBe('out');
    expect(await run.claims.findStaleClaims(0)).toEqual([]);
  });

  it('refuses a transfer with nothing filled in, writes nothing and frees the transfer', async () => {
    const run = build(0);

    await expect(run.splitPicking(['out'])).rejects.toEqual(
      new StockUserError('{name}: Nothing to split. Fill the quantities you want in a new transfer in the done quantities', {
        name: 'WH/OUT/00100',
      }),
    );
    expect(run.db.calls.filter((call) => call.name !== 'claim')).toEqual([]);
    expect(run.claimStore.rows.size).toBe(0);
  });

  it('splits one transfer at a time', async () => {
    await expect(build().splitPicking(['out', 'other'])).rejects.toEqual(new StockUserError('Split one transfer at a time.'));
  });

  it('ends after a stop at any write as a clean run does, or untouched when the stop came before the commit point', async () => {
    const initial = build().db.snapshot();
    const clean = build();
    await clean.splitPicking(['out']);
    const expected = clean.db.snapshot();

    for (let crashAt = 1; crashAt <= clean.db.writeCount; crashAt += 1) {
      const run = build();
      run.db.crashAt = crashAt;

      await runIntoCrash(run.splitPicking(['out']), { crashAt, cleanWrites: clean.db.writeCount });
      run.db.restart();
      const committed =
        run.claimStore.rows.get('split:out')?.progress?.committed === true || run.db.calls.some((call) => call.name !== 'claim');
      run.claimStore.advanceMinutes(16);
      await run.resumeSplit('out');

      expect({ crashAt, snapshot: run.db.snapshot() }).toEqual({ crashAt, snapshot: committed ? expected : initial });
      expect(await run.claims.findStaleClaims(0)).toEqual([]);
    }
  });
});
