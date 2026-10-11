import { groupBy } from 'src/shared/utils/group-by.util';
import { type LotRelocationPlan } from 'src/stock/utils/types/lot-relocation-plan.type';

export const LOT_IN_SEVERAL_LOCATIONS =
  'You can only move a lot/serial to a new location if it exists in a single location.';
export const LOT_RELOCATED_REASON = 'Lot/Serial Number Relocated';

const positiveLocationsOf = (quants: { locationId: string; quantity: number }[]) =>
  new Set(quants.filter((quant) => quant.quantity > 0).map((quant) => quant.locationId));

const lotLocationOf = (positiveLocations: Set<string>) => (positiveLocations.size === 1 ? [...positiveLocations][0] : null);

// The lot's location is the one place that holds positive stock of it; its on-hand
// quantity counts only the warehouses' stock, as product quantities do.
export const planLotSummary = ({
  quants,
  scopeLocationIds,
}: {
  quants: { locationId: string; quantity: number }[];
  scopeLocationIds: Set<string>;
}): { locationId: string | null; productQty: number } => {
  const productQty = quants
    .filter((quant) => scopeLocationIds.has(quant.locationId))
    .reduce((sum, quant) => sum + quant.quantity, 0);

  return {
    locationId: lotLocationOf(positiveLocationsOf(quants)),
    productQty: Number(productQty.toPrecision(15)),
  };
};

// The lots whose location is not the one their stock gives. A lot with no stock keeps a location typed on it, as a
// save does; a lot some run is moving is left to that run.
export const planLotLocationRepairs = ({
  lots,
  quants,
  heldLotIds,
}: {
  lots: { id: string; locationId: string | null }[];
  quants: { lotId: string; locationId: string; quantity: number }[];
  heldLotIds: Set<string>;
}): string[] => {
  const quantsByLot = groupBy(quants, (quant) => quant.lotId);

  return lots
    .filter((lot) => {
      const positiveLocations = positiveLocationsOf(quantsByLot.get(lot.id) ?? []);

      return !heldLotIds.has(lot.id) && positiveLocations.size > 0 && lotLocationOf(positiveLocations) !== lot.locationId;
    })
    .map((lot) => lot.id);
};

// The package is opened when it holds more than this lot's stock. A cleared location moves the stock where it
// already is, so its history shows the relocation and the lot's location comes back from the stock. Stock that
// already sits in the new location has nothing to move: a second delivery of the same edit finds it there.
export const planLotRelocation = ({
  quants,
  packageQuantCounts,
  newLocationId,
}: {
  quants: { id: string; locationId: string; quantity: number; packageId: string | null }[];
  packageQuantCounts: Map<string, number>;
  newLocationId: string | null;
}): LotRelocationPlan => {
  const positive = quants.filter((quant) => quant.quantity > 0);
  const locations = new Set(positive.map((quant) => quant.locationId));

  if (positive.length === 0) {
    return { kind: 'nothing' };
  }
  if (locations.size > 1) {
    return { kind: 'refuse', reason: LOT_IN_SEVERAL_LOCATIONS };
  }
  if (newLocationId !== null && locations.has(newLocationId)) {
    return { kind: 'nothing' };
  }
  const packageIds = new Set(positive.flatMap((quant) => quant.packageId ?? []));
  const packedQuants = [...packageIds].reduce((sum, packageId) => sum + (packageQuantCounts.get(packageId) ?? 0), 0);

  return { kind: 'move', quantIds: positive.map((quant) => quant.id), unpack: packedQuants > 1 };
};
