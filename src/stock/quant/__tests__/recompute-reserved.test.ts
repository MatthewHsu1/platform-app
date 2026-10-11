import { describe, expect, it } from 'vitest';

import { makeRecomputeReserved } from 'src/stock/quant/recompute-reserved';
import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';

const STOCK = 'p|stock|||';
const line = (id: string, quantity: number, key = STOCK) => ({
  id,
  key,
  moveId: `move-${id}`,
  quantity,
  quantityProductUom: quantity,
  picked: false,
  createdAt: '2026-10-08T10:00:00.000Z',
});

describe('recomputeReserved', () => {
  it('sets reserved to the open lines on the key and back to 0 when they go', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 2, reservedQuantity: 0, inDate: '2026-10-08T09:00:00.000Z' });
    const recompute = makeRecomputeReserved(fake.store);

    fake.openLines.push(line('a', 2));
    await recompute([STOCK]);
    expect(fake.quants.get(STOCK)).toMatchObject({ reservedQuantity: 2, availableQuantity: 0 });

    fake.openLines.length = 0;
    await recompute([STOCK]);
    expect(fake.quants.get(STOCK)).toMatchObject({ reservedQuantity: 0, availableQuantity: 2 });
  });

  it('keeps no reservation on a vendor location', async () => {
    const fake = makeFakeQuantStore({ usages: { vendors: 'SUPPLIER' } });
    await fake.store.create('p|vendors|||', { quantity: -5, reservedQuantity: 3, inDate: '2026-10-08T09:00:00.000Z' });
    fake.openLines.push(line('a', 3, 'p|vendors|||'));

    await makeRecomputeReserved(fake.store)(['p|vendors|||']);

    expect(fake.quants.get('p|vendors|||')?.reservedQuantity).toBe(0);
  });

  it('sums again after its write and follows a line added meanwhile', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 10, reservedQuantity: 0, inDate: '2026-10-08T09:00:00.000Z' });
    fake.openLines.push(line('a', 3));
    let added = false;
    fake.hooks.beforeWrite = () => {
      if (!added) {
        added = true;
        fake.openLines.push(line('b', 4));
      }
    };

    await makeRecomputeReserved(fake.store)([STOCK]);

    expect(fake.quants.get(STOCK)?.reservedQuantity).toBe(7);
  });

  it('makes a row with nothing on hand when lines reserve a key that has none', async () => {
    const fake = makeFakeQuantStore();
    fake.openLines.push(line('a', 1));

    await makeRecomputeReserved(fake.store)([STOCK]);

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 0, reservedQuantity: 1 });
  });
});
