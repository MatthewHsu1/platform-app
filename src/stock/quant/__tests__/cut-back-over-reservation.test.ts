import { describe, expect, it } from 'vitest';

import { makeCutBackOverReservation } from 'src/stock/quant/cut-back-over-reservation';
import { makeRecomputeReserved } from 'src/stock/quant/recompute-reserved';
import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';

const STOCK = 'p|stock|||';

const OLDER = { id: 'older', key: STOCK, moveId: 'move-older', quantity: 1, quantityProductUom: 1, picked: false, createdAt: '2026-10-08T10:00:00.000Z' };
const NEWER = { id: 'newer', key: STOCK, moveId: 'move-newer', quantity: 1, quantityProductUom: 1, picked: false, createdAt: '2026-10-08T10:00:00.500Z' };

// Two runs both read 1 free and each made a line of 1. Each step adds the
// lines a run made, then that run checks.
const interleavings: [string, (typeof OLDER)[][]][] = [
  ['the older run checks before the newer line exists', [[OLDER], [NEWER]]],
  ['both lines exist before either run checks', [[OLDER, NEWER], []]],
];

describe('two reservations race for the last unit', () => {
  it.each(interleavings)('keeps the older reservation and cuts the newer one when %s', async (_name, steps) => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 1, reservedQuantity: 0, inDate: '2026-10-08T09:00:00.000Z' });
    const recompute = makeRecomputeReserved(fake.store);
    const cutBack = makeCutBackOverReservation(fake.store);
    const changed: string[] = [];

    for (const added of steps) {
      fake.openLines.push(...added.map((line) => ({ ...line })));
      await recompute([STOCK]);
      changed.push(...(await cutBack([STOCK])).changedMoveIds);
    }

    expect(fake.openLines.map((line) => line.id)).toEqual(['older']);
    expect(fake.quants.get(STOCK)).toMatchObject({ quantity: 1, reservedQuantity: 1 });
    expect(changed).toEqual(['move-newer']);
  });

  it('keeps the older reservation when the stored reserved still counts a line already gone', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(STOCK, { quantity: 1, reservedQuantity: 2, inDate: '2026-10-08T09:00:00.000Z' });
    fake.openLines.push({ ...OLDER });

    const result = await makeCutBackOverReservation(fake.store)([STOCK]);

    expect(fake.openLines.map((line) => line.id)).toEqual(['older']);
    expect(result).toEqual({ changedMoveIds: [] });
  });

  it('does nothing on a location that is not internal', async () => {
    const fake = makeFakeQuantStore({ usages: { transit: 'TRANSIT' } });
    await fake.store.create('p|transit|||', { quantity: 0, reservedQuantity: 2, inDate: '2026-10-08T09:00:00.000Z' });
    fake.openLines.push({ id: 'a', key: 'p|transit|||', moveId: 'm', quantity: 2, quantityProductUom: 2, picked: false, createdAt: '2026-10-08T10:00:00.000Z' });

    expect(await makeCutBackOverReservation(fake.store)(['p|transit|||'])).toEqual({ changedMoveIds: [] });
    expect(fake.openLines).toHaveLength(1);
  });
});
