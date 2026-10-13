import { describe, expect, it } from 'vitest';

import { makeRecomputeKeyFromLedger } from 'src/stock/quant/recompute-key-from-ledger';
import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';

const STOCK = 'p|stock|||';

describe('recomputeKeyFromLedger', () => {
  it('sets on hand to done lines in minus done lines out', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 7, reservedQuantity: 2, inDate: '2026-10-08T09:00:00.000Z' });
    fake.doneLines.push(
      { sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 10 },
      { sourceKey: STOCK, destinationKey: 'p|customers|||', quantity: 4 },
    );

    await makeRecomputeKeyFromLedger(fake.store)(STOCK);

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 6, availableQuantity: 4 });
  });

  it('makes the row when it is missing and retries on a version clash', async () => {
    const fake = makeFakeQuantStore();
    fake.doneLines.push({ sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 3 });
    let interfered = false;
    fake.hooks.beforeWrite = (key) => {
      if (!interfered) {
        interfered = true;
        fake.writeBehindTheBack(key, { reservedQuantity: 1 });
      }
    };

    await makeRecomputeKeyFromLedger(fake.store)(STOCK);

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 3, reservedQuantity: 1, availableQuantity: 2 });
  });

  it('reads the done lines again after a clash, so a delta posted meanwhile is kept', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 0, reservedQuantity: 0, inDate: '2026-10-08T09:00:00.000Z' });
    fake.doneLines.push({ sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 3 });
    let posted = false;
    fake.hooks.beforeWrite = (key) => {
      if (!posted) {
        posted = true;
        fake.doneLines.push({ sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 2 });
        fake.writeBehindTheBack(key, { quantity: 2 });
      }
    };

    await makeRecomputeKeyFromLedger(fake.store)(STOCK);

    expect(fake.quants.get(STOCK)?.quantity).toBe(5);
  });

  it('writes nothing when on hand already matches', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 3, reservedQuantity: 0, inDate: '2026-10-08T09:00:00.000Z' });
    fake.doneLines.push({ sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 3 });

    await makeRecomputeKeyFromLedger(fake.store)(STOCK);

    expect(fake.hooks.compareAndSetCalls).toBe(0);
  });
});
