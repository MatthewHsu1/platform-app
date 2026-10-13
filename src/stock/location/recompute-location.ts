import { LOCATION_ROW } from 'src/stock/stock-rows';
import { stockLocations, stockWarehouses } from 'src/stock/stock-records';
import { todayUtc } from 'src/stock/stock-settings';
import { planLocationValues } from 'src/stock/utils/plan-location.util';
import { type LocationRow } from 'src/stock/types/location-row.type';

// The one writer of a location's full name, path, warehouse, next count date
// and replenish flag, for the given locations and everything under them.
export const recomputeLocation = async (locationIds: string[]) => {
  if (locationIds.length === 0) {
    return;
  }
  const [locations, warehouses] = await Promise.all([
    stockLocations.find<LocationRow>({}, LOCATION_ROW),
    stockWarehouses.find<{ id: string; viewLocationId: string | null; active: boolean }>({}, 'id viewLocationId active'),
  ]);

  for (const { id, data } of planLocationValues({ locations, warehouses, rootIds: locationIds, today: todayUtc() })) {
    await stockLocations.update(id, data);
  }
};
