import { LOCATION_ROW } from 'src/stock/stock-rows';
import { stockLocations } from 'src/stock/stock-records';
import { type LocationRow } from 'src/stock/types/location-row.type';

export const readLocations = async (ids: string[]) => {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map<string, LocationRow>();
  }
  const rows = await stockLocations.find<LocationRow>({ id: { in: unique } }, LOCATION_ROW);

  return new Map(rows.map((row) => [row.id, row]));
};

// A seed row is found by its key even after staff rename it.
export const findSeedLocationId = async (seedKey: string) => {
  const [row] = await stockLocations.find<{ id: string }>({ seedKey: { eq: seedKey } }, 'id');

  return row?.id ?? null;
};
