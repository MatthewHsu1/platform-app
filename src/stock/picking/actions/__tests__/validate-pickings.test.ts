import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE, makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { CrashError, FAKE_NOW, FakeStockDb, OPENING_IN_DATE, runIntoCrash } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makeDoneMoves } from 'src/stock/move/actions/done-moves';
import { makeCreateBackorder } from 'src/stock/picking/actions/create-backorder';
import { makeValidatePickings } from 'src/stock/picking/actions/validate-pickings';
import { quantKey } from 'src/stock/quant/quant-key';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';
import { type PreparedValidate } from 'src/stock/picking/types/prepared-validate.type';

const key = (productId: string, locationId: string, ownerId: string | null = null) =>
  quantKey({ productId, locationId, lotId: null, packageId: null, ownerId });

// Claim rows are writes too: a crash can follow any of them. A crashed server writes nothing more,
// so after a crash every claim write fails until the test brings the server back.
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

const runner = (db: FakeStockDb) => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(countClaimWrites(claimStore.store, db));
  const logged: string[][] = [];
  const printed: string[][] = [];
  const batchCalls: { pickingIds: string[]; batchesToValidate: string[] }[] = [];
  // Transfers the checks ask the backorder question about.
  const asking = new Set<string>();
  const { validatePickings, resumeValidate } = makeValidatePickings({
    // Like the real checks, a transfer already done is left out.
    prepareValidate: async (requestedIds, options) => {
      const pickingIds = requestedIds.filter((id) => db.pickings.get(id)?.state !== 'DONE');
      const asked = pickingIds.filter((id) => asking.has(id));

      if (asked.length > 0) {
        return { kind: 'needsAnswer', question: 'backorder', pickingIds: asked };
      }
      return {
        kind: 'ready',
        pickingIds,
        noBackorderIds: options.cancelBackorder === true ? pickingIds : [],
        askedIds: pickingIds.filter((id) => id !== 'full'),
      } satisfies PreparedValidate;
    },
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    heldClaimKeys: claims.heldClaimKeys,
    settleAllocations: async () => {},
    runStore: db,
    doneMoves: makeDoneMoves(db),
    createBackorder: makeCreateBackorder(db),
    retryWaitingMoves: (moveIds) => db.retryWaitingMoves(moveIds),
    logLessQuantities: async (pickingIds) => {
      logged.push(pickingIds);
      db.wrote('logLessQuantities', pickingIds);
    },
    autoprint: async (pickingIds) => {
      printed.push(pickingIds);
      return [];
    },
    receptionReportToShow: async () => [],
    afterValidateBatch: async ({ pickingIds, batchesToValidate }) => {
      batchCalls.push({ pickingIds, batchesToValidate });
    },
    sendDeliveryConfirmation: async () => {},
  });

  return { db, claims, claimStore, logged, printed, batchCalls, asking, validatePickings, resumeValidate };
};

const baseDb = () => {
  const db = new FakeStockDb();
  db.usage.set('stock', 'INTERNAL');
  db.usage.set('customers', 'CUSTOMER');
  db.usage.set('vendors', 'SUPPLIER');
  db.storable.add('P');
  db.storable.add('Q');
  db.storable.add('R');
  return db;
};

// A delivery of 5 belts with 3 picked, and 2 pulleys not picked; 8 belts in stock.
const build = async (ownerId: string | null = null) => {
  const db = baseDb();
  db.addPicking({ id: 'out', ownerId });
  db.setOpening(key('P', 'stock'), 8);
  db.addMove({ id: 'a', productId: 'P', productUomQty: 5, state: 'PARTIALLY_AVAILABLE', picked: true, pickingId: 'out' });
  db.addLine({ id: 'la', moveId: 'a', quantity: 3, picked: true });
  db.addMove({ id: 'b', productId: 'Q', productUomQty: 2, state: 'CONFIRMED', pickingId: 'out' });
  await db.syncReserved();
  return runner(db);
};

// A delivery that reserves at confirmation: 30 belts picked one line each (two chunks of lines on one
// key) out of a demand of 40 with only 20 in stock, while another delivery holds 5 of them; 2 pulleys
// not picked; 2 bolts with a picked line on a move that is not picked.
const buildLarge = async () => {
  const db = baseDb();
  db.addPicking({ id: 'out', reservationMethod: 'AT_CONFIRM' });
  db.addPicking({ id: 'other', scheduledDate: '2026-10-09T00:00:00.000Z' });
  db.setOpening(key('P', 'stock'), 20);
  db.setOpening(key('R', 'stock'), 2);
  db.addMove({ id: 'a', productId: 'P', productUomQty: 40, state: 'PARTIALLY_AVAILABLE', picked: true, pickingId: 'out', referenceIds: ['ref1'] });
  for (let index = 1; index <= 30; index += 1) {
    db.addLine({ id: `la${String(index).padStart(2, '0')}`, moveId: 'a', quantity: 1, picked: true });
  }
  db.addMove({ id: 'b', productId: 'Q', productUomQty: 2, state: 'CONFIRMED', pickingId: 'out' });
  db.addMove({ id: 'c', productId: 'R', productUomQty: 2, state: 'ASSIGNED', pickingId: 'out' });
  db.addLine({ id: 'lc', moveId: 'c', quantity: 2, picked: true });
  db.addMove({ id: 'm2', productId: 'P', productUomQty: 5, state: 'ASSIGNED', pickingId: 'other' });
  db.addLine({ id: 'l2', moveId: 'm2', quantity: 5 });
  await db.syncReserved();
  return runner(db);
};

type Run = Awaited<ReturnType<typeof build>>;

const crashThenResume = async (make: () => Promise<Run>, crashAt: number, cleanWrites: number | null = null) => {
  const run = await make();
  run.db.crashAt = crashAt;

  await runIntoCrash(run.validatePickings(['out'], {}), { crashAt, cleanWrites });
  run.db.restart();
  // Past the commit point: the claim says so, or (its row already gone) a stock row was written.
  const committed =
    run.claimStore.rows.get('validate:out')?.progress?.committed === true || run.db.calls.some((call) => call.name !== 'claim');
  run.claimStore.advanceMinutes(16);
  await run.resumeValidate('out');

  return { run, committed };
};

// Every write of a clean run, stock rows and claim rows alike: a stop after it, then a resume. A run
// that stopped before its commit point wrote nothing and is not finished (the click is made again).
const expectEveryStopToResume = async (make: () => Promise<Run>) => {
  const initial = (await make()).db.snapshot();
  const clean = await make();
  await clean.validatePickings(['out'], {});
  const expected = clean.db.snapshot();

  for (let crashAt = 1; crashAt <= clean.db.writeCount; crashAt += 1) {
    const { run, committed } = await crashThenResume(make, crashAt, clean.db.writeCount);

    expect({ crashAt, snapshot: run.db.snapshot() }).toEqual({ crashAt, snapshot: committed ? expected : initial });
    expect(await run.claims.findStaleClaims(0)).toEqual([]);
  }

  return clean.db.writeCount;
};

describe('validatePickings', () => {
  it('delivers 3 of 5, puts the rest and the unpicked move in a backorder, and dates the transfer', async () => {
    const { db, validatePickings } = await build();

    const result = await validatePickings(['out'], {});

    expect(result.kind === 'done' && result.backorderIds.length).toBe(1);
    expect(db.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 5, reservedQuantity: 0 });
    expect(db.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 3 });
    expect(db.snapshot().moves).toEqual([
      'P|CONFIRMED|2|backorder|MAKE_TO_STOCK|',
      'P|DONE|3|original|MAKE_TO_STOCK|',
      'Q|CONFIRMED|2|backorder|MAKE_TO_STOCK|',
    ]);
    expect(db.pickings.get('out')).toMatchObject({ dateDone: FAKE_NOW, priority: 'NORMAL' });
    expect(db.notes).toEqual(['out: The backorder WH/OUT/00001 has been created.']);
  });

  // Freeing the other delivery's reservation, reserving the backorder at confirmation,
  // the split copying the references, the in-date rule (stock below zero takes the run's time).
  it('delivers 30 of 40 from a stock of 20, frees the other delivery, and reserves the backorder', async () => {
    const { db, validatePickings } = await buildLarge();

    await validatePickings(['out'], {});
    const backorderId = [...db.pickings.values()].find((row) => row.backorderId === 'out')?.id ?? '';

    expect(db.quants.get(key('P', 'stock'))).toMatchObject({ quantity: -10, reservedQuantity: 0, inDate: FAKE_NOW });
    expect(db.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 30, inDate: FAKE_NOW });
    expect(db.lines.has('l2')).toBe(false);
    expect(db.moves.get('m2')).toMatchObject({ state: 'CONFIRMED', procureMethod: 'MAKE_TO_STOCK' });
    expect(db.snapshot().moves).toEqual([
      'P|CONFIRMED|10|backorder|MAKE_TO_STOCK|ref1',
      'P|CONFIRMED|5|original|MAKE_TO_STOCK|',
      'P|DONE|30|original|MAKE_TO_STOCK|ref1',
      'Q|CONFIRMED|2|backorder|MAKE_TO_STOCK|',
      'R|ASSIGNED|2|backorder|MAKE_TO_STOCK|',
    ]);
    expect(db.lines.get('lc')).toMatchObject({ pickingId: backorderId, picked: false });
    expect(db.idsOf('assignPickings')).toEqual([backorderId]);
  });

  it('ends with the stock of a clean run whatever write the server stopped after (resume)', async () => {
    expect(await expectEveryStopToResume(build)).toBeGreaterThan(10);
  });

  it('ends with the stock of a clean run after a stop at any write of a large transfer (resume)', async () => {
    expect(await expectEveryStopToResume(buildLarge)).toBeGreaterThan(120);
  });

  it('keeps the opening in-date when a stop falls before the second delta of a line', async () => {
    const clean = await build();
    await clean.validatePickings(['out'], {});
    const firstDelta = clean.db.calls.findIndex((call) => call.name === 'applyQuantDelta') + 1;

    const { run } = await crashThenResume(build, firstDelta);

    expect(run.db.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 3, inDate: OPENING_IN_DATE });
  });

  it('ends with the stock of a clean run when the resume stops too, then resumes again', async () => {
    const clean = await build();
    await clean.validatePickings(['out'], {});
    const expected = clean.db.snapshot();
    const writes = clean.db.writeCount;

    for (let firstCrash = 3; firstCrash <= writes; firstCrash += 1) {
      for (let secondCrash = 1; ; secondCrash += 1) {
        const run = await build();
        run.db.crashAt = firstCrash;
        await runIntoCrash(run.validatePickings(['out'], {}), { crashAt: firstCrash, cleanWrites: writes });
        run.db.restart();
        run.claimStore.advanceMinutes(16);
        run.db.crashAt = run.db.writeCount + secondCrash;

        const stopped = await run.resumeValidate('out').then(
          () => false,
          (error: unknown) => {
            if (!(error instanceof CrashError)) {
              throw error;
            }
            return true;
          },
        );

        run.db.restart();
        if (!stopped) {
          break;
        }
        run.claimStore.advanceMinutes(16);
        await run.resumeValidate('out');

        expect({ firstCrash, secondCrash, snapshot: run.db.snapshot() }).toEqual({ firstCrash, secondCrash, snapshot: expected });
        expect(await run.claims.findStaleClaims(0)).toEqual([]);
      }
    }
  }, 30_000);

  it('frees, without running it, a validation that stopped before its commit point', async () => {
    const initial = (await build()).db.snapshot();
    const { run, committed } = await crashThenResume(build, 1);

    expect(committed).toBe(false);
    expect(run.db.snapshot()).toEqual(initial);
    expect(run.claimStore.rows.size).toBe(0);
  });

  it('closes the batch with what the stopped click asked when it resumes', async () => {
    const run = await build();
    run.db.crashAt = 10;
    await expect(run.validatePickings(['out'], { batchesToValidate: ['batch1'] })).rejects.toBeInstanceOf(CrashError);
    run.db.restart();
    run.claimStore.advanceMinutes(16);

    await run.resumeValidate('out');

    expect(run.batchCalls).toEqual([{ pickingIds: ['out'], batchesToValidate: ['batch1'] }]);
  });

  it('lets one of two Validate clicks run; the other is told the transfer is being processed and prints nothing', async () => {
    const { db, logged, printed, validatePickings } = await build();
    const gate = db.gateCommits();

    const first = validatePickings(['out'], { cancelBackorder: true });
    await gate.reached;
    const second = await validatePickings(['out'], { cancelBackorder: true });
    gate.release();

    expect(await first).toMatchObject({ kind: 'done' });
    expect(second).toEqual({ kind: 'refused', reason: CLAIM_HELD_MESSAGE });
    expect(printed).toEqual([['out']]);
    expect(logged).toEqual([['out']]);
    expect(db.quants.get(key('P', 'stock'))?.quantity).toBe(5);
    expect(db.quants.get(key('P', 'customers'))?.quantity).toBe(3);
  });

  it('with the answer "no backorder": logs the short quantities, cancels the unpicked move, makes no backorder', async () => {
    const { db, logged, validatePickings } = await build();

    expect(await validatePickings(['out'], { cancelBackorder: true })).toEqual({ kind: 'done', backorderIds: [], doneIds: ['out'], printouts: [] });
    expect(logged).toEqual([['out']]);
    expect(db.moves.get('b')?.state).toBe('CANCEL');
    expect({ demand: db.moves.get('a')?.productUomQty, state: db.moves.get('a')?.state }).toEqual({ demand: 5, state: 'DONE' });
    expect([...db.pickings.values()].filter((row) => row.backorderId !== null)).toEqual([]);
  });

  // The "No backorder" button logs every transfer it validates; the plain answer logs only
  // the transfers answered "no backorder".
  it('logs the short quantities of every transfer validated when the answer is the "No backorder" button', async () => {
    const button = await build();
    button.db.addPicking({ id: 'full' });
    const unticked = await build();
    unticked.db.addPicking({ id: 'full' });

    await button.validatePickings(['out', 'full'], { cancelBackorder: true, logEveryTransfer: true });
    await unticked.validatePickings(['out', 'full'], { cancelBackorder: true });

    expect({ button: button.logged, unticked: unticked.logged }).toEqual({ button: [['out'], ['full']], unticked: [['out']] });
  });

  it('answers "try again" while an allocation holds the transfer, and moves no stock', async () => {
    const { claimStore, db, validatePickings } = await build();

    await claimStore.store.create({ key: 'allocate:out', runId: 'allocation', startedAt: claimStore.store.now().toISOString() });

    expect(await validatePickings(['out'], {})).toEqual({ kind: 'refused', reason: CLAIM_HELD_MESSAGE });
    expect(db.pickings.get('out')?.state).not.toBe('DONE');
    expect(db.quants.get(key('P', 'stock'))?.quantity).toBe(8);
  });

  it('answers "try again" when an allocation takes the transfer while the click is checked, and frees its claim', async () => {
    const { claimStore, db } = await build();
    const claims = makeClaims(claimStore.store);
    const { validatePickings } = makeValidatePickings({
      // The allocation starts after the first look and before this run holds the transfer.
      prepareValidate: async (pickingIds) => {
        await claimStore.store.create({ key: 'allocate:out', runId: 'allocation', startedAt: claimStore.store.now().toISOString() });
        return { kind: 'ready', pickingIds, noBackorderIds: [], askedIds: [] };
      },
      withClaim: claims.withClaim,
      openJournal: claims.openJournal,
      heldClaimKeys: claims.heldClaimKeys,
      settleAllocations: async () => {},
      runStore: db,
      doneMoves: makeDoneMoves(db),
      createBackorder: makeCreateBackorder(db),
      retryWaitingMoves: async () => {},
      logLessQuantities: async () => {},
      autoprint: async () => [],
      receptionReportToShow: async () => [],
      afterValidateBatch: async () => {},
      sendDeliveryConfirmation: async () => {},
    });

    expect(await validatePickings(['out'], {})).toEqual({ kind: 'refused', reason: CLAIM_HELD_MESSAGE });
    expect(db.quants.get(key('P', 'stock'))?.quantity).toBe(8);
    expect([...claimStore.rows.keys()]).toEqual(['allocate:out']);
  });

  it('returns a question unchanged and takes no claim', async () => {
    const { claimStore, db } = await build();
    const { validatePickings } = makeValidatePickings({
      prepareValidate: async (pickingIds) => ({ kind: 'needsAnswer', question: 'backorder', pickingIds }),
      withClaim: makeClaims(claimStore.store).withClaim,
      openJournal: makeClaims(claimStore.store).openJournal,
      heldClaimKeys: makeClaims(claimStore.store).heldClaimKeys,
      settleAllocations: async () => {},
      runStore: db,
      doneMoves: makeDoneMoves(db),
      createBackorder: makeCreateBackorder(db),
      retryWaitingMoves: async () => {},
      logLessQuantities: async () => {},
      autoprint: async () => [],
      receptionReportToShow: async () => [],
      afterValidateBatch: async () => {},
      sendDeliveryConfirmation: async () => {},
    });

    expect(await validatePickings(['out'], {})).toEqual({ kind: 'needsAnswer', question: 'backorder', pickingIds: ['out'] });
    expect(claimStore.rows.size).toBe(0);
    expect(db.writeCount).toBe(0);
  });

  it("takes the goods from the transfer owner's stock (consignment)", async () => {
    const { db, validatePickings } = await build('acme');

    await validatePickings(['out'], {});

    expect(db.moves.get('a')?.restrictPartnerId).toBe('acme');
    expect(db.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 8, reservedQuantity: 0 });
    expect(db.quants.get(key('P', 'stock', 'acme'))?.quantity).toBe(-3);
    expect(db.quants.get(key('P', 'customers', 'acme'))?.quantity).toBe(3);
  });

  it("puts a receipt's stock on its owner's rows, with the vendor row on the owner too", async () => {
    const db = baseDb();
    db.addPicking({ id: 'in', ownerId: 'owner1', pickingTypeCode: 'INCOMING' });
    db.addMove({ id: 'r', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true, pickingId: 'in', locationId: 'vendors', locationDestId: 'stock' });
    db.addLine({ id: 'lr', moveId: 'r', quantity: 1, picked: true });

    await runner(db).validatePickings(['in'], {});

    expect(db.moves.get('r')?.restrictPartnerId).toBe('owner1');
    expect(db.lines.get('lr')?.ownerId).toBe('owner1');
    expect(db.quants.get(key('P', 'vendors', 'owner1'))?.quantity).toBe(-1);
    expect(db.quants.get(key('P', 'stock', 'owner1'))?.quantity).toBe(1);
  });

  // The retry runs after the backorder is made, for receipts and internal transfers.
  it('retries the waiting moves of a receipt after its backorder is made', async () => {
    const db = baseDb();
    db.addPicking({ id: 'out', pickingTypeCode: 'INCOMING' });
    db.addMove({ id: 'r', productId: 'P', productUomQty: 6, state: 'ASSIGNED', picked: true, pickingId: 'out', locationId: 'vendors', locationDestId: 'stock' });
    db.addLine({ id: 'lr', moveId: 'r', quantity: 4, picked: true });
    const run = runner(db);

    await run.validatePickings(['out'], {});
    const order = db.calls.map((call) => call.name);

    expect(db.idsOf('retryWaitingMoves')).toEqual(['r']);
    expect(order.indexOf('retryWaitingMoves')).toBeGreaterThan(order.indexOf('moveMovesToPicking'));
  });
});

describe('a Validate click on a transfer that a stopped run left done', () => {
  // The fake does not work out transfer states, so the test marks the transfer done as the stopped step left it.
  const markDone = (db: FakeStockDb) => {
    const picking = db.pickings.get('out');
    if (picking !== undefined) {
      picking.state = 'DONE';
    }
  };

  // Stopped once the transfer is done, before its backorder is made.
  const stoppedAfterDone = async () => {
    const clean = await build();
    await clean.validatePickings(['out'], {});
    markDone(clean.db);
    const doneAt = clean.db.calls.findIndex((call) => call.name === 'updatePicking') + 1;
    const run = await build();
    run.db.crashAt = doneAt;
    await expect(run.validatePickings(['out'], {})).rejects.toBeInstanceOf(CrashError);
    run.db.restart();
    markDone(run.db);

    return { run, expected: clean.db.snapshot() };
  };

  it('finishes the stopped run when its claim has gone stale', async () => {
    const { run, expected } = await stoppedAfterDone();
    run.claimStore.advanceMinutes(16);

    const result = await run.validatePickings(['out'], {});

    expect(result.kind === 'done' && result.backorderIds.length).toBe(1);
    expect(run.db.snapshot()).toEqual(expected);
    expect(run.claimStore.rows.size).toBe(0);
  });

  it('waits for the answer another selected transfer needs before it finishes the stopped run', async () => {
    const { run, expected } = await stoppedAfterDone();
    run.claimStore.advanceMinutes(16);
    run.db.addPicking({ id: 'other' });
    run.asking.add('other');

    expect(await run.validatePickings(['out', 'other'], {})).toEqual({ kind: 'needsAnswer', question: 'backorder', pickingIds: ['other'] });
    expect(run.claimStore.rows.has('validate:out')).toBe(true);

    run.asking.clear();
    await run.validatePickings(['out', 'other'], { cancelBackorder: false });

    expect(run.claimStore.rows.size).toBe(0);
    expect(run.db.snapshot().moves).toEqual(expected.moves);
  });

  it('says the transfer is being processed while the stopped run is recent, and keeps its claim', async () => {
    const { run } = await stoppedAfterDone();

    expect(await run.validatePickings(['out'], {})).toEqual({ kind: 'refused', reason: CLAIM_HELD_MESSAGE });
    expect(run.claimStore.rows.has('validate:out')).toBe(true);
  });
});
