import { describe, expect, it } from 'vitest';

import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';
import { makeSettleQuantDelta } from 'src/stock/quant/settle-quant-delta';

const STOCK = 'p|stock|||';
const CUSTOMERS = 'p|customers|||';
const RECEIVED = '2026-09-01T00:00:00.000Z';
const NOW = '2026-10-08T12:00:00.000Z';

// A line of 4 from Stock to Customers is done (it is in the ledger); the server stopped somewhere
// between its commit and its two deltas. The done lines are what each key holds.
const stopped = async () => {
  const fake = makeFakeQuantStore({ usages: { customers: 'CUSTOMER' }, now: NOW });
  await fake.store.create(STOCK, { quantity: 10, reservedQuantity: 0, inDate: RECEIVED });
  fake.doneLines.push(
    { sourceKey: 'p|vendors|||', destinationKey: STOCK, quantity: 10 },
    { sourceKey: STOCK, destinationKey: CUSTOMERS, quantity: 4 },
  );
  return fake;
};

describe('settleQuantDelta', () => {
  it('posts a delta that never landed, with the in-date a clean run gives', async () => {
    const fake = await stopped();
    const settle = makeSettleQuantDelta(fake.store);

    const removed = await settle({ key: STOCK, delta: -4, inDate: null });
    await settle({ key: CUSTOMERS, delta: 4, inDate: removed.inDate });

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 6, inDate: RECEIVED });
    expect(fake.quants.get(CUSTOMERS)).toMatchObject({ quantity: 4, inDate: RECEIVED });
  });

  it('leaves a key whose delta already landed, and hands on its in-date', async () => {
    const fake = await stopped();
    await fake.store.create(CUSTOMERS, { quantity: 4, reservedQuantity: 0, inDate: RECEIVED });
    fake.quants.set(STOCK, { ...(fake.quants.get(STOCK) as NonNullable<ReturnType<typeof fake.quants.get>>), quantity: 6 });
    const settle = makeSettleQuantDelta(fake.store);

    const removed = await settle({ key: STOCK, delta: -4, inDate: null });
    await settle({ key: CUSTOMERS, delta: 4, inDate: removed.inDate });

    expect(removed.inDate).toBe(RECEIVED);
    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 6, version: 0 });
    expect(fake.quants.get(CUSTOMERS)).toMatchObject({ quantity: 4, version: 0 });
  });

  it('sets the key to the done lines when it matches neither', async () => {
    const fake = await stopped();
    fake.quants.set(STOCK, { ...(fake.quants.get(STOCK) as NonNullable<ReturnType<typeof fake.quants.get>>), quantity: 3 });

    await makeSettleQuantDelta(fake.store)({ key: STOCK, delta: -4, inDate: null });

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 6 });
  });
});
