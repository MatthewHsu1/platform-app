import { describe, expect, it } from 'vitest';

import { FakeStockDb } from 'src/stock/__tests__/fakes/fake-stock-db';
import { makeFreeReservation } from 'src/stock/move-line/free-reservation';
import { quantKey } from 'src/stock/quant/quant-key';

const key = (productId: string, locationId: string) => quantKey({ productId, locationId, lotId: null, packageId: null, ownerId: null });

const db = () => {
  const store = new FakeStockDb();
  store.usage.set('stock', 'INTERNAL');
  store.usage.set('customers', 'CUSTOMER');
  store.storable.add('P');
  store.addPicking({ id: 'p', scheduledDate: '2026-09-01T00:00:00.000Z' });
  store.addPicking({ id: 'other', scheduledDate: '2026-10-05T00:00:00.000Z' });
  store.addMove({ id: 'ma', productId: 'P', productUomQty: 2, state: 'ASSIGNED', pickingId: 'p' });
  store.addLine({ id: 'a', moveId: 'ma', quantity: 2 });
  store.addMove({ id: 'mb', productId: 'P', productUomQty: 2, state: 'ASSIGNED', pickingId: 'other' });
  store.addLine({ id: 'b', moveId: 'mb', quantity: 2 });
  return store;
};

describe('freeReservation', () => {
  it('destroys the line of the same transfer, shrinks the next one, and reassigns their moves', async () => {
    const store = db();

    await makeFreeReservation(store)({ key: key('P', 'stock'), shortfall: 3, pickingId: 'p', ignoreLineIds: [] });

    expect(store.lines.has('a')).toBe(false);
    expect(store.lines.get('b')?.quantity).toBe(1);
    expect(store.idsOf('makeMovesToStock')).toEqual(['mb', 'ma']);
    expect(store.idsOf('recomputeMove')).toEqual(['mb', 'ma']);
    expect(store.idsOf('assignMoves')).toEqual(['mb', 'ma']);
  });

  it('frees nothing on a location that bypasses reservation', async () => {
    const store = db();

    await makeFreeReservation(store)({ key: key('P', 'customers'), shortfall: 3, pickingId: 'p', ignoreLineIds: [] });

    expect(store.calls).toEqual([]);
  });
});
