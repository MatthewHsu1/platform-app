import { describe, expect, it } from 'vitest';

import { FAKE_NOW, FakeStockDb, memoryJournal, OPENING_IN_DATE } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makeDoneMoves } from 'src/stock/move/actions/done-moves';
import { makeDoneLineCorrection } from 'src/stock/move-line/done-line-correction';
import { quantKey } from 'src/stock/quant/quant-key';
import { planDoneLineCorrection } from 'src/stock/utils/plan-done-line-correction.util';
import { type CorrectionSide } from 'src/stock/utils/types/correction-side.type';

const key = (locationId: string) => quantKey({ productId: 'P', locationId, lotId: null, packageId: null, ownerId: null });

const side = (overrides: Partial<CorrectionSide> = {}): CorrectionSide => ({
  productId: 'P',
  locationId: 'shelf1',
  locationDestId: 'customers',
  ownerId: null,
  quantityProductUom: 1,
  ...overrides,
});

const db = () => {
  const store = new FakeStockDb();
  ['shelf1', 'shelf2', 'stock'].forEach((id) => store.usage.set(id, 'INTERNAL'));
  store.usage.set('customers', 'CUSTOMER');
  store.storable.add('P');
  store.addPicking({ id: 'p', pickingTypeCode: 'OUTGOING' });
  return store;
};

const ensureDoneLine = (store: FakeStockDb, quantity: number) => {
  if (!store.moves.has('done-move')) {
    store.addMove({ id: 'done-move', productId: 'P', productUomQty: quantity, state: 'DONE' });
  }
  if (!store.lines.has('done-line')) {
    store.addLine({ id: 'done-line', moveId: 'done-move', quantity, state: 'DONE' });
  }
};

const correct = async (
  store: FakeStockDb,
  before: CorrectionSide,
  after: CorrectionSide,
  { lineId = 'done-line', quantity = after.quantityProductUom } = {},
) => {
  ensureDoneLine(store, quantity);

  return makeDoneLineCorrection(store)({
    lineId,
    moveId: 'done-move',
    pickingId: 'p',
    productIds: ['P'],
    plan: planDoneLineCorrection({ before, after, storable: true, digits: 2 }),
    quantity,
    quantityProductUom: after.quantityProductUom,
    note: 'Quantity: 1 → 2',
    editId: 'edit-1',
  });
};

describe('applyDoneLineCorrection', () => {
  it('takes the unit from a shelf with no stock, which goes to -1', async () => {
    const store = db();
    store.setOpening(key('shelf1'), 0);
    store.setOpening(key('customers'), 1);

    await correct(store, side(), side({ locationId: 'shelf2' }));

    expect(store.quants.get(key('shelf1'))?.quantity).toBe(1);
    expect(store.quants.get(key('shelf2'))?.quantity).toBe(-1);
    expect(store.quants.get(key('customers'))?.quantity).toBe(1);
  });

  it("frees the other move's reservation on the new source and reassigns that move", async () => {
    const store = db();
    store.setOpening(key('shelf1'), 0);
    store.setOpening(key('shelf2'), 1);
    store.setOpening(key('customers'), 1);
    store.addMove({ id: 'move2', productId: 'P', productUomQty: 1, state: 'ASSIGNED', locationId: 'stock' });
    store.addLine({ id: 'l2', moveId: 'move2', quantity: 1, locationId: 'shelf2' });
    await store.syncReserved();

    await correct(store, side(), side({ locationId: 'shelf2' }));

    expect(store.lines.has('l2')).toBe(false);
    expect(store.idsOf('assignMoves')).toEqual(['move2']);
    expect(store.quants.get(key('shelf1'))?.quantity).toBe(1);
    expect(store.quants.get(key('shelf2'))).toMatchObject({ quantity: 0, reservedQuantity: 0 });
  });

  it('posts -1 at the source and +1 at the customer when 1 becomes 2, with a note', async () => {
    const store = db();
    store.setOpening(key('shelf1'), 0);
    store.setOpening(key('customers'), 1);

    await correct(store, side(), side({ quantityProductUom: 2 }));

    expect(store.quants.get(key('shelf1'))?.quantity).toBe(-1);
    expect(store.quants.get(key('customers'))?.quantity).toBe(2);
    expect(store.notes).toEqual(['p: Quantity: 1 → 2']);
    expect(store.idsOf('writeLine')).toEqual(['done-line']);
    expect(store.idsOf('recomputeProductQuantities')).toEqual(['P']);
  });

  it('gives the unit back with the in-date the removal passed on (now, the customer being a bypass location) when 5 becomes 4', async () => {
    const store = db();
    store.setOpening(key('stock'), 0);
    store.setOpening(key('customers'), 5);

    await correct(store, side({ locationId: 'stock', quantityProductUom: 5 }), side({ locationId: 'stock', quantityProductUom: 4 }));

    expect(store.quants.get(key('stock'))).toMatchObject({ quantity: 1, inDate: FAKE_NOW });
    expect(store.quants.get(key('customers'))?.quantity).toBe(4);
  });

  it('frees reservations in order: same transfer, then latest scheduled date, then newest (4 → 7)', async () => {
    const store = db();
    store.setOpening(key('stock'), 4);
    store.setOpening(key('customers'), 4);
    store.addPicking({ id: 'q', scheduledDate: '2026-10-05T00:00:00.000Z' });
    store.addPicking({ id: 'r', scheduledDate: '2026-10-01T00:00:00.000Z' });
    store.addMove({ id: 'mA', productId: 'P', productUomQty: 1, state: 'ASSIGNED', pickingId: 'p' });
    store.addLine({ id: 'A', moveId: 'mA', quantity: 1 });
    store.addMove({ id: 'mB', productId: 'P', productUomQty: 2, state: 'ASSIGNED', pickingId: 'q' });
    store.addLine({ id: 'B', moveId: 'mB', quantity: 2 });
    store.addMove({ id: 'mC', productId: 'P', productUomQty: 1, state: 'ASSIGNED', pickingId: 'r' });
    store.addLine({ id: 'C', moveId: 'mC', quantity: 1 });
    await store.syncReserved();

    await correct(store, side({ locationId: 'stock', quantityProductUom: 4 }), side({ locationId: 'stock', quantityProductUom: 7 }));

    expect([...store.lines.keys()].filter((id) => id !== 'done-line')).toEqual(['C']);
    expect(store.idsOf('assignMoves')).toEqual(['mB', 'mA']);
    expect(store.quants.get(key('stock'))).toMatchObject({ quantity: 1, reservedQuantity: 1 });
    expect(store.quants.get(key('customers'))?.quantity).toBe(7);
  });

  it('unreserves and reassigns the open destination moves of the edited line', async () => {
    const store = db();
    store.setOpening(key('shelf1'), 0);
    store.setOpening(key('customers'), 1);
    store.addMove({ id: 'done-move', productId: 'P', productUomQty: 1, state: 'DONE' });
    store.addMove({ id: 'next', productId: 'P', productUomQty: 1, state: 'ASSIGNED', moveOrigIds: ['done-move'] });

    await correct(store, side(), side({ quantityProductUom: 2 }));

    expect(store.idsOf('unreserveMoves')).toEqual(['next']);
    expect(store.idsOf('assignMoves')).toEqual(['next']);
  });

  it('passes on the in-date of the stock still held at an internal destination when 5 becomes 4', async () => {
    const store = db();
    store.setOpening(key('stock'), 0);
    store.setOpening(key('shelf2'), 5);

    await correct(
      store,
      side({ locationId: 'stock', locationDestId: 'shelf2', quantityProductUom: 5 }),
      side({ locationId: 'stock', locationDestId: 'shelf2', quantityProductUom: 4 }),
    );

    expect(store.quants.get(key('stock'))).toMatchObject({ quantity: 1, inDate: OPENING_IN_DATE });
  });

  it('gives the in-date of now when the removed key had no stock level', async () => {
    const store = db();
    store.setOpening(key('stock'), 0);

    await correct(
      store,
      side({ locationId: 'stock', locationDestId: 'shelf2', quantityProductUom: 5 }),
      side({ locationId: 'stock', locationDestId: 'shelf2', quantityProductUom: 4 }),
    );

    expect(store.quants.get(key('shelf2'))?.quantity).toBe(-1);
    expect(store.quants.get(key('stock'))).toMatchObject({ quantity: 1, inDate: FAKE_NOW });
  });

  it.each([
    ['in order', ['first', 'second']],
    ['out of order', ['second', 'first']],
  ])('adds up two quick edits (1 → 2, then 2 → 3) arriving %s', async (_name, order) => {
    const store = db();
    store.setOpening(key('shelf1'), 0);
    store.setOpening(key('customers'), 1);
    ensureDoneLine(store, 3);
    const edits: Record<string, [number, number]> = { first: [1, 2], second: [2, 3] };

    for (const name of order) {
      const [from, to] = edits[name];
      await correct(store, side({ quantityProductUom: from }), side({ quantityProductUom: to }), { quantity: to });
    }

    expect(store.quants.get(key('shelf1'))?.quantity).toBe(-2);
    expect(store.quants.get(key('customers'))?.quantity).toBe(3);
    expect(store.lines.get('done-line')).toMatchObject({ quantityProductUom: 3 });
    expect(store.idsOf('writeLine')).toEqual(['done-line']);
  });

  it('posts nothing and adds no note when the plan is empty', async () => {
    const store = db();
    store.setOpening(key('shelf1'), 4);

    await correct(store, side(), side());

    expect(store.idsOf('applyQuantDelta')).toEqual([]);
    expect(store.notes).toEqual([]);
    expect(store.idsOf('recomputeProductQuantities')).toEqual([]);
  });
});

describe('applyDoneLineCorrection with lots', () => {
  const at = (locationId: string, lotId: string | null) => quantKey({ productId: 'P', locationId, lotId, packageId: null, ownerId: null });

  // Two serials delivered, then one untracked unit received; the second done line is changed to a serial not in stock.
  it('puts the old serial back and sends the untracked unit as the new serial', async () => {
    const store = db();
    store.setOpening(at('stock', 'lot1'), 1);
    store.setOpening(at('stock', 'lot2'), 1);
    store.addMove({ id: 'm', productId: 'P', productUomQty: 2, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'l1', moveId: 'm', quantity: 1, picked: true, lotId: 'lot1' });
    store.addLine({ id: 'l2', moveId: 'm', quantity: 1, picked: true, lotId: 'lot2' });
    await store.syncReserved();
    await makeDoneMoves(store)(['m'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });
    store.setOpening(at('stock', null), 1);
    const doneLine = store.lines.get('l2');
    if (doneLine !== undefined) {
      doneLine.lotId = 'lot3';
    }
    const sideAt = (lotId: string) => side({ locationId: 'stock', lotId });

    await makeDoneLineCorrection(store)({
      lineId: 'l2',
      editId: 'edit-1',
      moveId: 'm',
      pickingId: null,
      productIds: ['P'],
      plan: planDoneLineCorrection({ before: sideAt('lot2'), after: sideAt('lot3'), storable: true, digits: 2 }),
      quantity: 1,
      quantityProductUom: 1,
      note: null,
    });

    expect([at('stock', 'lot1'), at('stock', 'lot2'), at('stock', 'lot3'), at('stock', null)].map((stockKey) => store.quants.get(stockKey)?.quantity)).toEqual([
      0, 1, 0, 0,
    ]);
    expect(store.quants.get(at('customers', 'lot3'))?.quantity).toBe(1);
    for (const [stockKey, quant] of store.quants) {
      expect({ stockKey, quantity: quant.quantity }).toEqual({ stockKey, quantity: await store.quantStore.ledgerTotal(stockKey) });
    }
  });

  const deliver = async (store: FakeStockDb, lotId: string | null) => {
    store.addMove({ id: 'm', productId: 'P', productUomQty: 1, state: 'ASSIGNED', picked: true });
    store.addLine({ id: 'l', moveId: 'm', quantity: 1, picked: true, lotId });
    await store.syncReserved();
    await makeDoneMoves(store)(['m'], { cancelBackorder: false, journal: memoryJournal(), stepPrefix: 'test' });
  };
  const edit = async (store: FakeStockDb, before: CorrectionSide, after: CorrectionSide) => {
    const doneLine = store.lines.get('l');
    if (doneLine !== undefined) {
      doneLine.lotId = after.lotId ?? null;
      doneLine.quantity = after.quantityProductUom;
    }
    await makeDoneLineCorrection(store)({
      lineId: 'l',
      editId: 'edit-1',
      moveId: 'm',
      pickingId: null,
      productIds: ['P'],
      plan: planDoneLineCorrection({ before, after, storable: true, digits: 2 }),
      quantity: after.quantityProductUom,
      quantityProductUom: after.quantityProductUom,
      note: null,
    });
  };
  const expectLedgerToHold = async (store: FakeStockDb) => {
    for (const [stockKey, quant] of store.quants) {
      expect({ stockKey, quantity: quant.quantity }).toEqual({ stockKey, quantity: await store.quantStore.ledgerTotal(stockKey) });
    }
  };

  it('turns the untracked unit back into the lot when a lot is set on a done line that had none', async () => {
    const store = db();
    store.setOpening(at('stock', null), 1);
    await deliver(store, null);

    await edit(store, side({ locationId: 'stock' }), side({ locationId: 'stock', lotId: 'lot1' }));

    expect([at('stock', 'lot1'), at('stock', null), at('customers', null), at('customers', 'lot1')].map((stockKey) => store.quants.get(stockKey)?.quantity)).toEqual([
      0, 0, 0, 1,
    ]);
    await expectLedgerToHold(store);
  });

  it('makes up the whole new quantity from the untracked stock when a lot line goes from 1 to 3', async () => {
    const store = db();
    store.setOpening(at('stock', null), 5);
    store.setOpening(at('stock', 'lot1'), 1);
    await deliver(store, 'lot1');

    await edit(store, side({ locationId: 'stock', lotId: 'lot1' }), side({ locationId: 'stock', lotId: 'lot1', quantityProductUom: 3 }));

    expect([at('stock', 'lot1'), at('stock', null), at('customers', 'lot1')].map((stockKey) => store.quants.get(stockKey)?.quantity)).toEqual([1, 2, 3]);
    await expectLedgerToHold(store);
  });
});
