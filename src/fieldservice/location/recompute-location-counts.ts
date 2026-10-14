import { fsmEquipments, fsmLocations } from 'src/fieldservice/fieldservice-records';
import { locationCounts } from 'src/fieldservice/utils/location-counts.util';
import { findMany } from 'src/shared/triggers/records';

// The one writer of the equipment and sub-location counts of every location. A move anywhere in the tree changes
// the counts of all the locations above it, so the whole tree is counted and only the counts that differ written.
export const recomputeLocationCounts = async () => {
  const found = await findMany<{
    locations: { id: string; parentId: string | null; equipmentCount: number | null; sublocationCount: number | null }[];
    equipment: { locationId: string | null }[];
  }>({
    locations: { of: fsmLocations, filter: {}, selection: 'id parentId equipmentCount sublocationCount' },
    equipment: { of: fsmEquipments, filter: {}, selection: 'locationId' },
  });
  const stored = new Map(found.locations.map((location) => [location.id, location]));

  for (const counts of locationCounts(found.locations, found.equipment.map((row) => row.locationId))) {
    const location = stored.get(counts.id);

    await fsmLocations.update(counts.id, {
      ...(location?.equipmentCount === counts.equipmentCount ? {} : { equipmentCount: counts.equipmentCount }),
      ...(location?.sublocationCount === counts.sublocationCount ? {} : { sublocationCount: counts.sublocationCount }),
    });
  }
};
