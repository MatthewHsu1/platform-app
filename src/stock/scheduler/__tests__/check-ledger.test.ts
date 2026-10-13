import { describe, expect, it } from 'vitest';

import { LEDGER_RECHECK_WAIT_MS, makeCheckLedger } from 'src/stock/scheduler/check-ledger';
import { makeFakeLedgerStore } from 'src/stock/scheduler/__tests__/fakes/fake-ledger-store';

describe('checkLedger', () => {
  it('fixes only the differences that persist through the wait, and notes each fix', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([
        ['p|landing|||', 10],
        ['p|wrong|||', 5],
        ['p|moving|||', 8],
        ['p|missing|||', 3],
        ['p|right|||', 1],
      ]),
      quants: [
        { id: 'q-landing', quantKey: 'p|landing|||', quantity: 8, reservedQuantity: 0, version: 3, productId: 'p' },
        { id: 'q-wrong', quantKey: 'p|wrong|||', quantity: 7, reservedQuantity: 2, version: 2, productId: 'p' },
        { id: 'q-moving', quantKey: 'p|moving|||', quantity: 6, reservedQuantity: 0, version: 5, productId: 'p' },
        { id: 'q-right', quantKey: 'p|right|||', quantity: 1, reservedQuantity: 0, version: 1, productId: 'p' },
      ],
      onWait: ({ quants, totals }) => {
        // The posting in flight lands: +2 on the row, version 4.
        Object.assign(quants[0], { quantity: 10, version: 4 });
        // Another posting changes both sides of "moving": the difference is not the same any more.
        Object.assign(quants[2], { quantity: 7, version: 6 });
        totals.set('p|moving|||', 9);
      },
    });

    const result = await makeCheckLedger(store)();

    expect(state.waits).toEqual([LEDGER_RECHECK_WAIT_MS]);
    expect(result.fixed.sort()).toEqual(['p|missing|||', 'p|wrong|||']);
    expect(result.settled.sort()).toEqual(['p|landing|||', 'p|moving|||']);
    expect(state.quants.find((quant) => quant.id === 'q-wrong')).toMatchObject({ quantity: 5, version: 3 });
    expect(state.quants.find((quant) => quant.quantKey === 'p|missing|||')).toMatchObject({ quantity: 3 });
    expect(state.quants.find((quant) => quant.id === 'q-landing')).toMatchObject({ quantity: 10, version: 4 });
    expect(state.notes.map((note) => note.quantId).sort()).toEqual(['q-new-4', 'q-wrong']);
    expect(state.notes.find((note) => note.quantId === 'q-wrong')?.body).toBe(
      'Stock level corrected from 7 to 5 to match the done move lines.',
    );
  });

  it('does not wait when every row matches its ledger', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([['p|stock|||', 4]]),
      quants: [{ id: 'q', quantKey: 'p|stock|||', quantity: 4, reservedQuantity: 0, version: 1, productId: 'p' }],
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: [], settled: [] });
    expect(state.waits).toEqual([]);
  });

  it('ignores products that are not storable', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: [],
      totals: new Map([['consumable|stock|||', 4]]),
      quants: [],
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: [], settled: [] });
    expect(state.quants).toEqual([]);
  });

  it('leaves a row that another run moved after the second read: settled, not forced, no note', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([['p|stock|||', 5]]),
      quants: [{ id: 'q', quantKey: 'p|stock|||', quantity: 7, reservedQuantity: 0, version: 2, productId: 'p' }],
      onCompareAndSet: ({ quants }) => {
        Object.assign(quants[0], { quantity: 8, version: 3 });
      },
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: [], settled: ['p|stock|||'] });
    expect(state.quants[0]).toMatchObject({ quantity: 8, version: 3 });
    expect(state.notes).toEqual([]);
  });

  it('leaves a missing row that another run made first: settled, its row kept, no note', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([['p|stock|||', 3]]),
      quants: [],
      onCreateQuant: ({ quants }) => {
        quants.push({ id: 'q-other', quantKey: 'p|stock|||', quantity: 5, reservedQuantity: 0, version: 0, productId: 'p' });
      },
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: [], settled: ['p|stock|||'] });
    expect(state.quants).toEqual([
      { id: 'q-other', quantKey: 'p|stock|||', quantity: 5, reservedQuantity: 0, version: 0, productId: 'p' },
    ]);
    expect(state.notes).toEqual([]);
  });

  it('puts back a soft-deleted row that holds a missing key and sets it to the done lines at once', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([['p|stock|||', 3]]),
      quants: [],
      trashed: [{ id: 'q-trashed', quantKey: 'p|stock|||', quantity: 9, reservedQuantity: 0, version: 4, productId: 'p' }],
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: ['p|stock|||'], settled: [] });
    expect(state.quants).toEqual([expect.objectContaining({ id: 'q-trashed', quantity: 3, version: 5 })]);
    expect(state.notes).toEqual([
      { quantId: 'q-trashed', body: 'Stock level corrected from 9 to 3 to match the done move lines.' },
    ]);
  });

  it('checks the other products when one product cannot be read, then reports that product', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['unreadable', 'p'],
      totals: new Map([['p|stock|||', 5]]),
      quants: [{ id: 'q', quantKey: 'p|stock|||', quantity: 7, reservedQuantity: 0, version: 2, productId: 'p' }],
    });
    const failing = {
      ...store,
      ledgerTotals: async (productIds: string[]) => {
        if (productIds.includes('unreadable')) {
          throw new Error('too many stock places');
        }
        return store.ledgerTotals(productIds);
      },
    };

    await expect(makeCheckLedger(failing)()).rejects.toThrow('unreadable: too many stock places');
    expect(state.quants[0]).toMatchObject({ quantity: 5 });
  });

  it('leaves no stock available on a repaired row of a lot past its removal date', async () => {
    const { store, state } = makeFakeLedgerStore({
      storable: ['p'],
      totals: new Map([['p|stock|lot||', 5]]),
      quants: [
        {
          id: 'q',
          quantKey: 'p|stock|lot||',
          quantity: 7,
          reservedQuantity: 0,
          version: 2,
          productId: 'p',
          removalDate: '2020-01-01T00:00:00.000Z',
          useExpirationDate: true,
        },
      ],
    });

    expect(await makeCheckLedger(store)()).toEqual({ fixed: ['p|stock|lot||'], settled: [] });
    expect(state.quants[0]).toMatchObject({ quantity: 5, availableQuantity: 0 });
  });
});
