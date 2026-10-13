import { describe, expect, it } from 'vitest';

import { CrashError, FakeStockDb, memoryJournal, OPENING_IN_DATE } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makeDoneMoves } from 'src/stock/move/actions/done-moves';
import { parseQuantKey, quantKey } from 'src/stock/quant/quant-key';
import { planReserve } from 'src/stock/utils/plan-reserve.util';
import { resolveUoms } from 'src/uom/utils/uom.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';

const key = (productId: string, locationId: string, ownerId: string | null = null) =>
  quantKey({ productId, locationId, lotId: null, packageId: null, ownerId });

const db = () => {
  const store = new FakeStockDb();
  store.usage.set('stock', 'INTERNAL');
  store.usage.set('customers', 'CUSTOMER');
  store.storable.add('P');
  store.storable.add('Q');
  return store;
};

// Its confirm plans procurements through the journal it is given, and the
// first confirm stops after storing that plan.
class ProcuringStockDb extends FakeStockDb {
  plannedProcurements = 0;
  stopConfirm = true;

  override async confirmMoves(moveIds: string[], options?: { journal?: ClaimJournal }) {
    const plan = async () => {
      this.plannedProcurements += 1;
      return moveIds;
    };
    const work = async () => {
      if (this.stopConfirm) {
        this.stopConfirm = false;
        throw new Error('stopped');
      }
    };

    if (options?.journal === undefined) {
      await plan();
      await work();
    } else {
      await options.journal.step('procure', plan, work);
    }
    return super.confirmMoves(moveIds);
  }
}

describe('doneMoves', () => {
  it('finishes a stopped confirm of draft moves without planning their procurements again', async () => {
    const store = new ProcuringStockDb();
    store.usage.set('stock', 'INTERNAL');
    store.usage.set('customers', 'CUSTOMER');
    store.addMove({ id: 'draft', productId: 'P', productUomQty: 1, state: 'DRAFT', procureMethod: 'MAKE_TO_ORDER' });
    const journal = memoryJournal();

    await expect(makeDoneMoves(store)(['draft'], { cancelBackorder: false, journal, stepPrefix: 'test' })).rejects.toThrow('stopped');
    await makeDoneMoves(store)(['draft'], { cancelBackorder: false, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });

    expect(store.plannedProcurements).toBe(1);
  });


  it('frees the 15 another move reserved when 30 leave a stock of 30', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 30);
    store.addMove({ id: 'move1', productId: 'P', productUomQty: 15, state: 'ASSIGNED' });
    store.addLine({ id: 'line1', moveId: 'move1', quantity: 15, createdAt: '2026-10-08T09:00:00.000Z' });
    store.addMove({ id: 'move2', productId: 'P', productUomQty: 15, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'line2', moveId: 'move2', quantity: 30, picked: true, createdAt: '2026-10-08T09:01:00.000Z' });
    await store.syncReserved();

    const result = await makeDoneMoves(store)(['move2'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

    expect(result).toEqual({ doneMoveIds: ['move2'], backorderMoveIds: [], touchedSourceKeys: [key('P', 'stock')] });
    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 0, reservedQuantity: 0 });
    expect(store.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 30 });
    expect(store.lines.has('line1')).toBe(false);
    expect(store.lines.get('line2')?.state).toBe('DONE');
    expect(store.moves.get('move2')?.state).toBe('DONE');
    expect(store.moves.get('move1')?.procureMethod).toBe('MAKE_TO_STOCK');
    expect(store.idsOf('assignMoves')).toEqual(['move1']);
  });

  // The freeing writes after its first one: the shortfall that called for them is gone by then.
  it('finishes freeing the other move when the server stopped in the middle', async () => {
    const setup = async () => {
      const store = db();
      store.setOpening(key('P', 'stock'), 30);
      store.addMove({ id: 'move1', productId: 'P', productUomQty: 15, state: 'ASSIGNED' });
      store.addLine({ id: 'line1', moveId: 'move1', quantity: 15, createdAt: '2026-10-08T09:00:00.000Z' });
      store.addMove({ id: 'move2', productId: 'P', productUomQty: 15, state: 'ASSIGNED', picked: true });
      store.addLine({ id: 'line2', moveId: 'move2', quantity: 30, picked: true, createdAt: '2026-10-08T09:01:00.000Z' });
      await store.syncReserved();
      return store;
    };
    const clean = await setup();
    await makeDoneMoves(clean)(['move2'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });
    const store = await setup();
    const journal = memoryJournal();
    store.crashAt = clean.calls.findIndex((call) => call.name === 'destroyLines') + 1;

    await expect(makeDoneMoves(store)(['move2'], { cancelBackorder: false, journal, stepPrefix: 'test' })).rejects.toBeInstanceOf(
      CrashError,
    );
    store.restart();
    await makeDoneMoves(store)(['move2'], { cancelBackorder: false, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });

    expect(store.moves.get('move1')).toMatchObject({ state: 'CONFIRMED', procureMethod: 'MAKE_TO_STOCK' });
    expect(store.idsOf('assignMoves')).toEqual(['move1']);
    expect(store.snapshot()).toEqual(clean.snapshot());
  });

  it('gives the split move the references of its move', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 2);
    store.addPicking({ id: 'out' });
    store.addMove({ id: 'a', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true, pickingId: 'out', referenceIds: ['ref1'] });
    store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true });
    await store.syncReserved();

    const result = await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

    expect(store.moves.get(result.backorderMoveIds[0])?.referenceIds).toEqual(['ref1']);
  });

  it('does 1 of 2 and splits the other 1 into a new move', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 2);
    store.addPicking({ id: 'out' });
    store.addMove({ id: 'a', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true, pickingId: 'out' });
    store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true });
    await store.syncReserved();

    const result = await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

    expect(result.backorderMoveIds).toHaveLength(1);
    const split = store.moves.get(result.backorderMoveIds[0]);
    expect({ demand: split?.productUomQty, state: split?.state, pickingId: split?.pickingId }).toEqual({
      demand: 1,
      state: 'CONFIRMED',
      pickingId: 'out',
    });
    expect({ demand: store.moves.get('a')?.productUomQty, state: store.moves.get('a')?.state }).toEqual({ demand: 1, state: 'DONE' });
    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 1, reservedQuantity: 0 });
  });

  it('takes a lot line from the stock row of its lot and puts it on the same lot at the destination', async () => {
    const store = db();
    const lotKey = (locationId: string) => quantKey({ productId: 'P', locationId, lotId: 'lot1', packageId: null, ownerId: null });
    store.setOpening(key('P', 'stock'), 3);
    store.setOpening(lotKey('stock'), 2);
    store.addMove({ id: 'a', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'la', moveId: 'a', quantity: 2, picked: true, lotId: 'lot1' });
    await store.syncReserved();

    await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

    expect(store.quants.get(lotKey('stock'))).toMatchObject({ quantity: 0 });
    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 3 });
    expect(store.quants.get(lotKey('customers'))).toMatchObject({ quantity: 2 });
  });

  it('keeps the stock of each package apart: a package can go below zero on its own', async () => {
    const store = db();
    store.usage.set('suppliers', 'SUPPLIER');
    const packed = (locationId: string, packageId: string, lotId: string | null = null) =>
      quantKey({ productId: 'P', locationId, lotId, packageId, ownerId: null });
    const run = (moveId: string) => makeDoneMoves(store)([moveId], { cancelBackorder: true, journal: memoryJournal(), stepPrefix: moveId });

    store.addMove({ id: 'in', productId: 'P', productUomQty: 300, state: 'ASSIGNED', picked: true, locationId: 'suppliers', locationDestId: 'stock' });
    store.addLine({ id: 'in1', moveId: 'in', quantity: 120, picked: true, resultPackageId: 'pallet1' });
    store.addLine({ id: 'in2', moveId: 'in', quantity: 120, picked: true, lotId: 'lotA', resultPackageId: 'pallet2' });
    store.addLine({ id: 'in3', moveId: 'in', quantity: 60, picked: true, resultPackageId: 'pallet3' });
    await run('in');

    store.addMove({ id: 'out', productId: 'P', productUomQty: 300, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'out1', moveId: 'out', quantity: 120, picked: true, packageId: 'pallet1' });
    store.addLine({ id: 'out2', moveId: 'out', quantity: 140, picked: true, lotId: 'lotA', packageId: 'pallet2' });
    store.addLine({ id: 'out3', moveId: 'out', quantity: 10, picked: true, packageId: 'pallet3' });
    await store.syncReserved();
    await run('out');

    expect(store.quants.get(packed('stock', 'pallet1'))).toMatchObject({ quantity: 0 });
    expect(store.quants.get(packed('stock', 'pallet2', 'lotA'))).toMatchObject({ quantity: -20 });
    expect(store.quants.get(packed('stock', 'pallet3'))).toMatchObject({ quantity: 50 });
    expect(store.quants.get(quantKey({ productId: 'P', locationId: 'customers', lotId: 'lotA', packageId: null, ownerId: null }))).toMatchObject({
      quantity: 140,
    });
  });

  it('unpacking reserved packed stock frees the reservation on the package, and Check Availability then reserves it unpacked', async () => {
    const store = db();
    const inPallet = quantKey({ productId: 'P', locationId: 'stock', lotId: null, packageId: 'pallet', ownerId: null });
    store.setOpening(inPallet, 3);
    store.addMove({ id: 'out', productId: 'P', productUomQty: 3, state: 'ASSIGNED' });
    store.addLine({ id: 'reserved', moveId: 'out', quantity: 3, packageId: 'pallet' });
    await store.syncReserved();
    store.addMove({ id: 'unpack', productId: 'P', productUomQty: 3, state: 'CONFIRMED', picked: true, isInventory: true, locationDestId: 'stock' });
    store.addLine({ id: 'unpack-line', moveId: 'unpack', quantity: 3, picked: true, locationDestId: 'stock', packageId: 'pallet' });

    await makeDoneMoves(store)(['unpack'], { cancelBackorder: true, journal: memoryJournal(), stepPrefix: 'unpack' });

    expect(store.lines.has('reserved')).toBe(false);
    expect(store.idsOf('assignMoves')).toEqual(['out']);
    expect(store.quants.get(inPallet)).toMatchObject({ quantity: 0, reservedQuantity: 0 });
    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 3 });

    const reserved = planReserve({
      moves: [
        {
          id: 'out',
          productId: 'P',
          productUomId: 'unit',
          productUomQty: 3,
          quantity: 0,
          state: 'CONFIRMED',
          picked: false,
          procureMethod: 'MAKE_TO_STOCK',
          locationId: 'stock',
          locationParentPath: 'stock/',
          locationDestId: 'customers',
          pickingId: null,
          packagingUomId: null,
          bypass: false,
          originPoolKey: null,
          originAvailable: [],
          lines: [],
        },
      ],
      quants: [...store.quants.entries()].map(([stockKey, quant]) => {
        const parts = parseQuantKey(stockKey);
        return {
          id: quant.id,
          productId: parts.productId,
          locationId: parts.locationId,
          locationParentPath: `${parts.locationId}/`,
          locationCompleteName: parts.locationId,
          ownerId: parts.ownerId,
          inDate: quant.inDate,
          quantity: quant.quantity,
          reservedQuantity: quant.reservedQuantity,
          lotId: parts.lotId,
          packageId: parts.packageId,
        };
      }),
      products: new Map([['P', { uomId: 'unit', packagingReserveMethod: 'PARTIAL' }]]),
      uoms: resolveUoms([{ id: 'unit', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null }]).resolved,
      digits: 2,
    });

    expect(reserved.creates).toEqual([expect.not.objectContaining({ packageId: expect.anything() })]);
    expect(reserved.creates[0]).toMatchObject({ moveId: 'out', locationId: 'stock', quantity: 3 });
  });

  it('cancels the unpicked move and splits nothing when there is no backorder', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 2);
    store.setOpening(key('Q', 'stock'), 2);
    store.addPicking({ id: 'out' });
    store.addMove({ id: 'a', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true, pickingId: 'out' });
    store.addLine({ id: 'la', moveId: 'a', quantity: 2, picked: true });
    store.addMove({ id: 'b', productId: 'Q', productUomQty: 2, state: 'ASSIGNED', pickingId: 'out' });
    store.addLine({ id: 'lb', moveId: 'b', quantity: 2 });
    await store.syncReserved();

    const result = await makeDoneMoves(store)(['a', 'b'], { cancelBackorder: true, journal: memoryJournal(), stepPrefix: 'test' });

    expect(result).toEqual({ doneMoveIds: ['a'], backorderMoveIds: [], touchedSourceKeys: [key('P', 'stock')] });
    expect(store.moves.get('b')?.state).toBe('CANCEL');
    expect(store.quants.get(key('Q', 'stock'))).toMatchObject({ quantity: 2 });
  });

  it('retries waiting moves only after an incoming or internal transfer, unless told', async () => {
    const store = db();
    store.addPicking({ id: 'in', pickingTypeCode: 'INCOMING' });
    store.usage.set('vendors', 'SUPPLIER');
    store.addMove({ id: 'r', productId: 'P', productUomQty: 4, state: 'ASSIGNED', picked: true, pickingId: 'in', locationId: 'vendors', locationDestId: 'stock' });
    store.addLine({ id: 'lr', moveId: 'r', quantity: 4, picked: true });

    await makeDoneMoves(store)(['r'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

    expect(store.idsOf('retryWaitingMoves')).toEqual(['r']);
    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 4 });
    expect(store.quants.get(key('P', 'vendors'))).toMatchObject({ quantity: -4 });
  });

  it('recomputes a line already done from the ledger on a resumed run, never posting it twice', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 5);
    store.addMove({ id: 'a', productId: 'P', productUomQty: 3, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'la', moveId: 'a', quantity: 3, picked: true });
    await store.syncReserved();
    const journal = memoryJournal();
    store.crashAt = store.writeCount + 2; // applyTrackingOnDone, then the commit of the line

    await expect(makeDoneMoves(store)(['a'], { cancelBackorder: false, journal, stepPrefix: 'test' })).rejects.toBeInstanceOf(CrashError);
    expect(store.lines.get('la')?.state).toBe('DONE');
    store.restart();

    await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });

    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 2, reservedQuantity: 0, inDate: OPENING_IN_DATE });
    expect(store.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 3, inDate: OPENING_IN_DATE });
  });

  // The done lines are the truth for every key. Another run has committed a line on the
  // same key but not yet posted its delta while this run resumes; only the line that was in flight
  // when this run stopped is read from the ledger, so the other run's delta still lands once.
  it('leaves the keys of lines it had fully posted alone when it resumes', async () => {
    const store = db();
    store.storable.add('R');
    store.setOpening(key('P', 'stock'), 10);
    store.setOpening(key('R', 'stock'), 5);
    store.addMove({ id: 'a', productId: 'P', productUomQty: 3, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'la', moveId: 'a', quantity: 3, picked: true });
    store.addMove({ id: 'c', productId: 'R', productUomQty: 1, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'lc', moveId: 'c', quantity: 1, picked: true });
    await store.syncReserved();
    const journal = memoryJournal();
    store.crashAt = store.writeCount + 6; // tracking; la: commit, two deltas, reserved; then the commit of lc

    await expect(makeDoneMoves(store)(['a', 'c'], { cancelBackorder: false, journal, stepPrefix: 'test' })).rejects.toBeInstanceOf(
      CrashError,
    );
    store.restart();
    store.addMove({ id: 'b', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'lb', moveId: 'b', quantity: 2, picked: true, state: 'DONE' });

    await makeDoneMoves(store)(['a', 'c'], { cancelBackorder: false, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });
    await store.applyQuantDelta({ key: key('P', 'stock'), delta: -2, inDate: null });
    await store.applyQuantDelta({ key: key('P', 'customers'), delta: 2, inDate: null });

    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 5 });
    expect(store.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 5 });
    expect(store.quants.get(key('R', 'stock'))).toMatchObject({ quantity: 4 });
    expect(store.quants.get(key('R', 'customers'))).toMatchObject({ quantity: 1 });
  });

  describe('a lot made from a typed name at validation', () => {
    const lotKeyAt = (locationId: string) => quantKey({ productId: 'P', locationId, lotId: 'lot-new', packageId: null, ownerId: null });

    // The tracking step points the line at the lot made from its typed name.
    class LotMakingStockDb extends FakeStockDb {
      override async applyTrackingOnDone(lineIds: string[]) {
        lineIds.forEach((id) => {
          const line = this.lines.get(id);
          if (line !== undefined && (line.lotId ?? null) === null) {
            line.lotId = 'lot-new';
          }
        });
        await super.applyTrackingOnDone(lineIds);
      }
    }

    const setup = async () => {
      const store = new LotMakingStockDb();
      store.usage.set('stock', 'INTERNAL');
      store.usage.set('shelf', 'INTERNAL');
      store.storable.add('P');
      store.setOpening(key('P', 'stock'), 5);
      store.addMove({ id: 'a', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true, locationDestId: 'shelf' });
      store.addLine({ id: 'la', moveId: 'a', quantity: 2, picked: true });
      await store.syncReserved();
      return store;
    };

    it('frees the reservation the line held on the stock row without a lot', async () => {
      const store = await setup();
      expect(store.quants.get(key('P', 'stock'))).toMatchObject({ reservedQuantity: 2 });

      const result = await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

      expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 3, reservedQuantity: 0 });
      expect(store.quants.get(lotKeyAt('stock'))).toMatchObject({ quantity: 0 });
      expect(store.quants.get(lotKeyAt('shelf'))).toMatchObject({ quantity: 2 });
      expect(new Set(result.touchedSourceKeys)).toEqual(new Set([lotKeyAt('stock'), key('P', 'stock')]));
    });

    it('frees it too when the server stopped right after the line was committed', async () => {
      const clean = await setup();
      await makeDoneMoves(clean)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });
      const store = await setup();
      const journal = memoryJournal();
      store.crashAt = store.writeCount + 2; // tracking, then the commit of the line

      await expect(makeDoneMoves(store)(['a'], { cancelBackorder: false, journal, stepPrefix: 'test' })).rejects.toBeInstanceOf(
        CrashError,
      );
      store.restart();
      await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });

      expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 3, reservedQuantity: 0 });
      expect(store.snapshot()).toEqual(clean.snapshot());
    });
  });

  describe('a lot line that takes its lot below zero', () => {
    const lotKeyAt = (locationId: string) => quantKey({ productId: 'P', locationId, lotId: 'lot1', packageId: null, ownerId: null });
    const run = (store: FakeStockDb, journal: ClaimJournal) =>
      makeDoneMoves(store)(['a'], { cancelBackorder: false, journal, stepPrefix: 'test' });

    // One untracked unit in stock; a line names lot1, which holds nothing.
    const setup = async () => {
      const store = db();
      store.setOpening(key('P', 'stock'), 1);
      store.addMove({ id: 'a', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true });
      store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true, lotId: 'lot1' });
      await store.syncReserved();
      return store;
    };
    const expectLedgerToHold = async (store: FakeStockDb) => {
      for (const [stockKey, quant] of store.quants) {
        expect({ stockKey, quantity: quant.quantity }).toEqual({ stockKey, quantity: await store.quantStore.ledgerTotal(stockKey) });
      }
    };

    it('turns the untracked unit into the lot, so the stock ends at zero', async () => {
      const store = await setup();

      await run(store, memoryJournal());

      expect(store.quants.get(lotKeyAt('stock'))).toMatchObject({ quantity: 0, reservedQuantity: 0 });
      expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 0, reservedQuantity: 0 });
      expect(store.quants.get(lotKeyAt('customers'))).toMatchObject({ quantity: 1 });
      await expectLedgerToHold(store);
    });

    it('ends the same after a stop at any write and a resume', async () => {
      const clean = await setup();
      const before = clean.writeCount;
      await run(clean, memoryJournal());

      for (let crashAt = before + 1; crashAt <= clean.writeCount; crashAt += 1) {
        const store = await setup();
        const journal = memoryJournal();
        store.crashAt = crashAt;

        await expect(run(store, journal)).rejects.toBeInstanceOf(CrashError);
        store.restart();
        await run(store, memoryJournal(true, journal.progress));

        expect({ crashAt, snapshot: store.snapshot(), compensations: store.compensations.size }).toEqual({
          crashAt,
          snapshot: clean.snapshot(),
          compensations: 1,
        });
        await expectLedgerToHold(store);
      }
    });
  });

  describe('lot compensation around other reservations and at the destination', () => {
    const at = (locationId: string, lotId: string | null) => quantKey({ productId: 'P', locationId, lotId, packageId: null, ownerId: null });

    it("frees another move's reservation of the lot by the shortfall left before the lot was made up", async () => {
      const store = db();
      store.setOpening(at('stock', 'lot1'), 1);
      store.setOpening(at('stock', null), 1);
      store.addPicking({ id: 'out2' });
      store.addMove({ id: 'b', productId: 'P', productUomQty: 1, state: 'ASSIGNED', pickingId: 'out2' });
      store.addLine({ id: 'lb', moveId: 'b', quantity: 1, lotId: 'lot1' });
      store.addMove({ id: 'a', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true });
      store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true, lotId: 'lot1' });
      await store.syncReserved();

      await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

      expect(store.quants.get(at('stock', 'lot1'))).toMatchObject({ quantity: 1, reservedQuantity: 0 });
      expect(store.quants.get(at('stock', null))).toMatchObject({ quantity: 0 });
      expect(store.lines.has('lb')).toBe(false);
      expect(store.idsOf('makeMovesToStock')).toEqual(['b']);
      expect(store.idsOf('assignMoves')).toContain('b');
    });

    it('makes up a lot still below zero at the destination from the stock without a lot there', async () => {
      const store = db();
      store.usage.set('shelf', 'INTERNAL');
      store.setOpening(at('stock', 'lot1'), 1);
      store.setOpening(at('shelf', 'lot1'), -2);
      store.setOpening(at('shelf', null), 5);
      store.addMove({ id: 'a', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true, locationDestId: 'shelf' });
      store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true, lotId: 'lot1' });
      await store.syncReserved();

      await makeDoneMoves(store)(['a'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });

      expect([at('stock', 'lot1'), at('shelf', 'lot1'), at('shelf', null)].map((stockKey) => store.quants.get(stockKey)?.quantity)).toEqual([
        0, 0, 4,
      ]);
      for (const [stockKey, quant] of store.quants) {
        expect({ stockKey, quantity: quant.quantity }).toEqual({ stockKey, quantity: await store.quantStore.ledgerTotal(stockKey) });
      }
    });
  });

  describe('a line whose source and destination are the same lot row', () => {
    const lotKeyAt = quantKey({ productId: 'P', locationId: 'stock', lotId: 'lot1', packageId: null, ownerId: null });
    const setup = async () => {
      const store = db();
      store.setOpening(lotKeyAt, -2);
      store.setOpening(key('P', 'stock'), 5);
      store.addMove({ id: 'a', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true, locationDestId: 'stock' });
      store.addLine({ id: 'la', moveId: 'a', quantity: 1, picked: true, lotId: 'lot1' });
      await store.syncReserved();
      return store;
    };
    const run = (store: FakeStockDb, journal: ClaimJournal) =>
      makeDoneMoves(store)(['a'], { cancelBackorder: false, journal, stepPrefix: 'test' });

    it('makes up the lot once for each side, one unit each', async () => {
      const store = await setup();

      await run(store, memoryJournal());

      expect(store.quants.get(lotKeyAt)?.quantity).toBe(0);
      expect(store.quants.get(key('P', 'stock'))?.quantity).toBe(3);
      expect(store.compensations.size).toBe(2);
    });

    it('ends the same after a stop at any write and a resume', async () => {
      const clean = await setup();
      const before = clean.writeCount;
      await run(clean, memoryJournal());

      for (let crashAt = before + 1; crashAt <= clean.writeCount; crashAt += 1) {
        const store = await setup();
        const journal = memoryJournal();
        store.crashAt = crashAt;

        await expect(run(store, journal)).rejects.toBeInstanceOf(CrashError);
        store.restart();
        await run(store, memoryJournal(true, journal.progress));

        expect({ crashAt, snapshot: store.snapshot(), compensations: store.compensations.size }).toEqual({
          crashAt,
          snapshot: clean.snapshot(),
          compensations: 2,
        });
      }
    });
  });

  it('skips a line that is gone by the time it would be committed', async () => {
    const store = db();
    store.setOpening(key('P', 'stock'), 5);
    store.addMove({ id: 'a', productId: 'P', productUomQty: 3, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'la', moveId: 'a', quantity: 2, picked: true });
    store.addLine({ id: 'lx', moveId: 'a', quantity: 1, picked: true });
    await store.syncReserved();
    const journal = memoryJournal();
    store.crashAt = store.writeCount + 1; // tracking
    await expect(makeDoneMoves(store)(['a'], { cancelBackorder: true, journal, stepPrefix: 'test' })).rejects.toBeInstanceOf(CrashError);
    store.restart();
    store.lines.delete('lx');

    await makeDoneMoves(store)(['a'], { cancelBackorder: true, journal: memoryJournal(true, journal.progress), stepPrefix: 'test' });

    expect(store.quants.get(key('P', 'stock'))).toMatchObject({ quantity: 3, reservedQuantity: 0 });
    expect(store.quants.get(key('P', 'customers'))).toMatchObject({ quantity: 2 });
  });
});
