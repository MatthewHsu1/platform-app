import { describe, expect, it } from 'vitest';

import { makeRepairLotLocations } from 'src/stock/scheduler/steps/repair-lot-locations';
import { planLotSummary } from 'src/stock/utils/plan-lot-location.util';

const setup = (lots: Record<string, string | null>, quants: { lotId: string; locationId: string; quantity: number }[], held: string[]) => {
  const stored = new Map(Object.entries(lots));
  const written: string[] = [];
  const recomputed: string[] = [];
  const repair = makeRepairLotLocations({
    readLots: async () => [...stored.entries()].map(([id, locationId]) => ({ id, locationId })),
    readLotQuants: async (lotIds) => quants.filter((quant) => lotIds.includes(quant.lotId) && quant.quantity > 0),
    readHeldLotIds: async (lotIds) => new Set(lotIds.filter((lotId) => held.includes(lotId))),
    recomputeLot: async (lotIds) => {
      recomputed.push(...lotIds);
      for (const lotId of lotIds) {
        const { locationId } = planLotSummary({ quants: quants.filter((quant) => quant.lotId === lotId), scopeLocationIds: new Set() });

        if (locationId !== stored.get(lotId)) {
          stored.set(lotId, locationId);
          written.push(lotId);
        }
      }
    },
  });

  return { repair, stored, written, recomputed };
};

describe('repairLotLocations', () => {
  it('gives a lot whose location disagrees with its stock the location of its stock, skips a claimed lot and leaves a correct one unwritten', async () => {
    const { repair, stored, written, recomputed } = setup(
      { shownOnShelf: 'shelf', claimed: 'shelf', correct: 'A' },
      [
        { lotId: 'shownOnShelf', locationId: 'stock', quantity: 4 },
        { lotId: 'claimed', locationId: 'stock', quantity: 1 },
        { lotId: 'correct', locationId: 'A', quantity: 2 },
      ],
      ['claimed'],
    );

    await repair();

    expect({ locations: Object.fromEntries(stored), written, recomputed }).toEqual({
      locations: { shownOnShelf: 'stock', claimed: 'shelf', correct: 'A' },
      written: ['shownOnShelf'],
      recomputed: ['shownOnShelf'],
    });
  });
});
