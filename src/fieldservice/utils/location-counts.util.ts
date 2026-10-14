import { subtreeCounts } from 'src/fieldservice/utils/subtree-counts.util';
import { ancestorIds } from 'src/fieldservice/utils/ancestor-ids.util';

type LocationCounts = { id: string; equipmentCount: number; sublocationCount: number };

// Each location counts every location below it and every equipment assigned to it or to a location below it.
export const locationCounts = (
  locations: { id: string; parentId: string | null }[],
  equipmentLocationIds: (string | null)[],
): LocationCounts[] => {
  const parentById = new Map(locations.map((location) => [location.id, location.parentId]));
  const below = new Map<string, { kind: 'location' | 'equipment' }[]>(locations.map((location) => [location.id, []]));

  for (const location of locations) {
    for (const ancestorId of new Set(ancestorIds(location.id, parentById))) {
      if (ancestorId !== location.id) {
        below.get(ancestorId)?.push({ kind: 'location' });
      }
    }
  }
  for (const locationId of equipmentLocationIds) {
    if (locationId === null) {
      continue;
    }
    for (const holderId of new Set([locationId, ...ancestorIds(locationId, parentById)])) {
      below.get(holderId)?.push({ kind: 'equipment' });
    }
  }
  return locations.map((location) => {
    const counts = subtreeCounts(below.get(location.id) ?? []);

    return { id: location.id, equipmentCount: counts.equipment, sublocationCount: counts.locations };
  });
};
