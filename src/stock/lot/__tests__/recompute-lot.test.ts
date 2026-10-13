import { describe, expect, it } from 'vitest';

import { makeRecomputeLot } from 'src/stock/lot/recompute-lot';

type Lot = { id: string; locationId: string | null; productQty: number | null };
type Quant = { lotId: string; locationId: string; quantity: number };

const setup = (lots: Lot[], quants: Quant[]) => {
  const stored = new Map(lots.map((lot) => [lot.id, { ...lot }]));
  const writes: { id: string; data: Record<string, unknown> }[] = [];
  const recomputeLot = makeRecomputeLot({
    readLots: async (ids) => ids.flatMap((id) => (stored.has(id) ? [{ ...(stored.get(id) as Lot) }] : [])),
    readLotQuants: async (ids) => quants.filter((quant) => ids.includes(quant.lotId)),
    readScopeLocationIds: async () => new Set(['A', 'B', 'C']),
    updateLots: async (ids, data) => {
      for (const id of ids) {
        writes.push({ id, data });
        stored.set(id, { ...(stored.get(id) as Lot), ...data });
      }
    },
  });

  return { recomputeLot, stored, writes, quants };
};

describe('recomputeLot', () => {
  it('sets the one location holding the lot and its on-hand quantity', async () => {
    const { recomputeLot, stored } = setup(
      [{ id: 'lot', locationId: null, productQty: 0 }],
      [
        { lotId: 'lot', locationId: 'A', quantity: 1 },
        { lotId: 'lot', locationId: 'vendors', quantity: -1 },
      ],
    );

    await recomputeLot(['lot']);

    expect(stored.get('lot')).toEqual({ id: 'lot', locationId: 'A', productQty: 1 });
  });

  it('clears the location once the lot also sits in a second location', async () => {
    const { recomputeLot, stored, quants } = setup(
      [{ id: 'lot', locationId: 'A', productQty: 1 }],
      [{ lotId: 'lot', locationId: 'A', quantity: 1 }],
    );
    quants.push({ lotId: 'lot', locationId: 'C', quantity: 10 });

    await recomputeLot(['lot']);

    expect(stored.get('lot')).toEqual({ id: 'lot', locationId: null, productQty: 11 });
  });

  it('shows the one location again once the stock left the other one', async () => {
    const { recomputeLot, stored } = setup(
      [{ id: 'lot', locationId: null, productQty: 11 }],
      [
        { lotId: 'lot', locationId: 'A', quantity: 0 },
        { lotId: 'lot', locationId: 'C', quantity: 11 },
      ],
    );

    await recomputeLot(['lot']);

    expect(stored.get('lot')).toEqual({ id: 'lot', locationId: 'C', productQty: 11 });
  });

  it('writes nothing when the lot already shows its location and quantity', async () => {
    const { recomputeLot, writes } = setup(
      [{ id: 'lot', locationId: 'A', productQty: 1 }],
      [{ lotId: 'lot', locationId: 'A', quantity: 1 }],
    );

    await recomputeLot(['lot', 'lot']);

    expect(writes).toEqual([]);
  });

  it('writes only the value that changed', async () => {
    const { recomputeLot, writes } = setup(
      [{ id: 'lot', locationId: 'A', productQty: 1 }],
      [{ lotId: 'lot', locationId: 'A', quantity: 3 }],
    );

    await recomputeLot(['lot']);

    expect(writes).toEqual([{ id: 'lot', data: { productQty: 3 } }]);
  });

  it('on a put-back, a lot that holds no stock keeps the location typed on it', async () => {
    const { recomputeLot, stored, writes } = setup(
      [
        { id: 'empty', locationId: 'B', productQty: 0 },
        { id: 'stocked', locationId: 'B', productQty: 1 },
      ],
      [{ lotId: 'stocked', locationId: 'A', quantity: 1 }],
    );

    await recomputeLot(['empty', 'stocked'], { keepWhenEmpty: true });

    expect({ empty: stored.get('empty')?.locationId, stocked: stored.get('stocked')?.locationId, written: writes.map((write) => write.id) }).toEqual({
      empty: 'B',
      stocked: 'A',
      written: ['stocked'],
    });
  });
});
