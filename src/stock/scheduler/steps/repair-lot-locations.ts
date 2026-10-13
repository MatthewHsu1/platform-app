import { claimKey, heldClaimKeys } from 'src/shared/claims/claim';
import { stockLots } from 'src/stock/lot/lot-records';
import { recomputeLot } from 'src/stock/lot/recompute-lot';
import { stockQuants } from 'src/stock/stock-records';
import { planLotLocationRepairs } from 'src/stock/utils/plan-lot-location.util';

type RepairLotLocationsStore = {
  readLots: () => Promise<{ id: string; locationId: string | null }[]>;
  // The lots' rows holding positive stock.
  readLotQuants: (lotIds: string[]) => Promise<{ lotId: string; locationId: string; quantity: number }[]>;
  readHeldLotIds: (lotIds: string[]) => Promise<Set<string>>;
  recomputeLot: (lotIds: string[]) => Promise<void>;
};

// Lots whose stock is read in one filter.
const LOT_CHUNK = 200;

const lotKey = (lotId: string) => claimKey('relocateLot', lotId);

// A lot shows where its stock is. A save cut short, or any write that missed the lot, can leave it showing another
// place; each night those lots get the location of their stock again, unless a run is moving them.
export const makeRepairLotLocations = (store: RepairLotLocationsStore) => async () => {
  const lots = await store.readLots();

  for (let start = 0; start < lots.length; start += LOT_CHUNK) {
    const chunk = lots.slice(start, start + LOT_CHUNK);
    const lotIds = chunk.map((lot) => lot.id);
    const [quants, heldLotIds] = await Promise.all([store.readLotQuants(lotIds), store.readHeldLotIds(lotIds)]);
    const repairs = planLotLocationRepairs({ lots: chunk, quants, heldLotIds });

    if (repairs.length > 0) {
      await store.recomputeLot(repairs);
    }
  }
};

export const repairLotLocations = makeRepairLotLocations({
  readLots: () => stockLots.find<{ id: string; locationId: string | null }>({}, 'id locationId'),
  readLotQuants: (lotIds) =>
    stockQuants.find<{ lotId: string; locationId: string; quantity: number }>(
      { lotId: { in: lotIds }, quantity: { gt: 0 } },
      'lotId locationId quantity',
    ),
  readHeldLotIds: async (lotIds) => {
    const held = new Set(await heldClaimKeys(lotIds.map(lotKey)));

    return new Set(lotIds.filter((lotId) => held.has(lotKey(lotId))));
  },
  recomputeLot,
});
