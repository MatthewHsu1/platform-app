import { describe, expect, it } from 'vitest';

import { makeApplyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';

const STOCK = 'p|stock|||';
const VENDORS = 'p|vendors|||';

describe('applyQuantDelta', () => {
  it('makes the missing rows and moves 100 from the vendor into stock', async () => {
    const fake = makeFakeQuantStore({ usages: { vendors: 'SUPPLIER' } });
    const apply = makeApplyQuantDelta(fake.store);

    const out = await apply({ key: VENDORS, delta: -100, inDate: null });
    const into = await apply({ key: STOCK, delta: 100, inDate: out.inDate });

    expect(fake.quants.get(VENDORS)?.quantity).toBe(-100);
    expect(into).toMatchObject({ quantity: 100, inDate: '2026-10-08T12:00:00.000Z' });
    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 100, availableQuantity: 100, version: 1 });
  });

  it('reads again and applies on the new value when another run wrote first', async () => {
    const fake = makeFakeQuantStore();
    const apply = makeApplyQuantDelta(fake.store);
    await apply({ key: STOCK, delta: 10, inDate: null });
    let interfered = false;
    fake.hooks.beforeWrite = (key) => {
      if (!interfered) {
        interfered = true;
        fake.writeBehindTheBack(key, { quantity: 15 });
      }
    };

    const result = await apply({ key: STOCK, delta: -4, inDate: null });

    expect(result.quantity).toBe(11);
    expect(fake.quants.get(STOCK)?.quantity).toBe(11);
  });

  it('lets stock go negative', async () => {
    const fake = makeFakeQuantStore();
    expect((await makeApplyQuantDelta(fake.store)({ key: STOCK, delta: -1, inDate: null })).quantity).toBe(-1);
  });

  it('reads the row another run created at the same moment', async () => {
    const fake = makeFakeQuantStore();
    fake.hooks.clashOnCreate = 1;

    expect((await makeApplyQuantDelta(fake.store)({ key: STOCK, delta: 3, inDate: null })).quantity).toBe(3);
    expect([...fake.quants.keys()]).toEqual([STOCK]);
  });

  it('marks a set count outdated when stock moves under it', async () => {
    const fake = makeFakeQuantStore();
    const apply = makeApplyQuantDelta(fake.store);
    await apply({ key: STOCK, delta: 7, inDate: null });
    fake.writeBehindTheBack(STOCK, { inventoryQuantitySet: true, inventoryQuantity: 5, inventoryDiffQuantity: -2 });

    await apply({ key: STOCK, delta: -3, inDate: null });

    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 4, isOutdated: true });
  });

  it('stops after ten clashes in a row', async () => {
    const fake = makeFakeQuantStore();
    const apply = makeApplyQuantDelta(fake.store);
    await apply({ key: STOCK, delta: 1, inDate: null });
    fake.hooks.beforeWrite = (key) => fake.writeBehindTheBack(key, {});

    await expect(apply({ key: STOCK, delta: 1, inDate: null })).rejects.toThrow(`Could not update the stock level ${STOCK} after 10 tries.`);
  });

  it('waits longer after each clash, so a writer that keeps losing is not starved', async () => {
    const fake = makeFakeQuantStore();
    const waits: number[] = [];
    fake.store.wait = async (ms) => {
      waits.push(ms);
    };
    const apply = makeApplyQuantDelta(fake.store);
    await apply({ key: STOCK, delta: 1, inDate: null });
    let clashes = 0;
    fake.hooks.beforeWrite = (key) => {
      if (clashes < 9) {
        clashes += 1;
        fake.writeBehindTheBack(key, {});
      }
    };

    await apply({ key: STOCK, delta: 1, inDate: null });

    expect(waits).toHaveLength(9);
    expect(Math.max(...waits.slice(-3))).toBeGreaterThan(Math.max(...waits.slice(0, 3)));
  });
});
