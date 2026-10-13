import { describe, expect, it } from 'vitest';

import { makeRecomputeAfterLineChanges } from 'src/stock/move-line/rules/recompute-after-line-changes';
import { makeRecomputeReserved } from 'src/stock/quant/recompute-reserved';
import { makeFakeQuantStore } from 'src/stock/quant/__tests__/fakes/fake-quant-store';

const NO_LOT = 'p|stock|||';
const lotKey = (lotId: string) => `p|stock|${lotId}||`;
const line = (id: string, key: string) => ({
  id,
  key,
  moveId: 'move',
  quantity: 1,
  quantityProductUom: 1,
  picked: false,
  createdAt: `2026-10-08T10:00:0${id.length}.000Z`,
});

describe('recomputeAfterLineChanges', () => {
  // Two untracked units reserved by two lines; staff type a new serial number on each line.
  it('keeps every reserved line when staff type lots that have no stock yet, and moves the reservation to the lots', async () => {
    const fake = makeFakeQuantStore();
    await fake.store.create(NO_LOT, { quantity: 2, reservedQuantity: 2, inDate: '2026-10-08T09:00:00.000Z' });
    fake.openLines.push(line('l3', lotKey('lot3')), line('l4x', lotKey('lot4')));
    const recompute = makeRecomputeAfterLineChanges({
      recomputeReserved: makeRecomputeReserved(fake.store),
      recomputeMove: async () => {},
      readPickingIds: async () => [],
      recomputePickingState: async () => {},
      recomputeProductQuantities: async () => {},
    });

    await recompute({ keys: [NO_LOT, lotKey('lot3'), lotKey('lot4')], moveIds: ['move'], productIds: ['p'] });

    expect(fake.openLines.map((row) => [row.id, row.quantity])).toEqual([
      ['l3', 1],
      ['l4x', 1],
    ]);
    expect(fake.quants.get(NO_LOT)).toMatchObject({ quantity: 2, reservedQuantity: 0 });
    expect(fake.quants.get(lotKey('lot3'))).toMatchObject({ quantity: 0, reservedQuantity: 1 });
  });
});
