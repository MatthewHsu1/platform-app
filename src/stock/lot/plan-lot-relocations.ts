import { countBy } from 'src/shared/utils/count-by.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { readLocations } from 'src/stock/location/read-locations';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { stockQuants } from 'src/stock/stock-records';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import { planLotRelocation } from 'src/stock/utils/plan-lot-location.util';
import { type LotRelocationReads } from 'src/stock/lot/types/lot-relocation-reads.type';
import { type LotRelocationRequest } from 'src/stock/lot/types/lot-relocation-request.type';
import { type RelocateLotPlan } from 'src/stock/lot/types/relocate-lot-plan.type';

// Each lot's plan, from one read of each kind for all of them. Read inside the lots' claims, so the plans see the
// stock as it is when the run starts.
export const makePlanLotRelocations =
  (store: LotRelocationReads) =>
  async (requests: LotRelocationRequest[]): Promise<Map<string, RelocateLotPlan>> => {
    const lotIds = requests.map((request) => request.lotId);
    const cleared = requests.filter((request) => request.toLocationId === null).map((request) => request.lotId);
    const [quants, lotLocations, locations] = await Promise.all([
      store.readLotQuants(lotIds),
      cleared.length === 0 ? new Map<string, string | null>() : store.readLotLocations(cleared),
      store.readLocations([...new Set(requests.flatMap((request) => request.toLocationId ?? []))]),
    ]);
    const packageQuantCounts = await store.readPackageQuantCounts([...new Set(quants.flatMap((quant) => quant.packageId ?? []))]);

    const planOne = (lotId: string, toLocationId: string | null): RelocateLotPlan => {
      // A cleared location is put back by the run that handles it; finding it set again, a second delivery of the
      // same edit has nothing to do.
      if (toLocationId === null && (lotLocations.get(lotId) ?? null) !== null) {
        return { kind: 'nothing' };
      }
      const plan = planLotRelocation({
        quants: quants.filter((quant) => quant.lotId === lotId),
        packageQuantCounts,
        newLocationId: toLocationId,
      });

      if (plan.kind !== 'move') {
        return plan.kind === 'refuse' ? { ...plan, values: {} } : plan;
      }
      const destination = toLocationId === null ? undefined : locations.get(toLocationId);

      // A virtual location holds no stock: the moves would fail after the run passed its commit point.
      if (destination?.usage === LOCATION_USAGE.VIEW) {
        return { kind: 'refuse', reason: VIEW_LOCATION_REASON, values: { location: destination.completeName ?? '' } };
      }
      return { ...plan, toLocationId };
    };

    return new Map(requests.map(({ lotId, toLocationId }) => [lotId, planOne(lotId, toLocationId)]));
  };

export const planLotRelocations = makePlanLotRelocations({
  readLotQuants: (lotIds) =>
    stockQuants.find<{ id: string; lotId: string; locationId: string; quantity: number; packageId: string | null }>(
      { lotId: { in: lotIds }, quantity: { gt: 0 } },
      'id lotId locationId quantity packageId',
    ),
  readPackageQuantCounts: async (packageIds) =>
    countBy(
      await stockQuants.find<{ packageId: string }>(
        { packageId: { in: packageIds }, or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }] },
        'packageId',
      ),
      (quant) => quant.packageId,
    ),
  readLotLocations: async (lotIds) =>
    new Map(
      (await stockLots.find<{ id: string; locationId: string | null }>({ id: { in: lotIds } }, 'id locationId')).map((lot) => [
        lot.id,
        lot.locationId,
      ]),
    ),
  readLocations,
});
