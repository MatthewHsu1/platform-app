import { resolveTree } from 'src/shared/utils/resolve-tree.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { addDays, daysBetween } from 'src/stock/utils/stock-dates.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type LocationTreeRow } from 'src/stock/utils/types/location-tree-row.type';

export const planNextInventoryDate = ({
  usage,
  cyclicInventoryFrequency,
  lastInventoryDate,
  today,
}: {
  usage: LocationUsage;
  cyclicInventoryFrequency: number | null;
  lastInventoryDate: string | null;
  today: string;
}) => {
  const frequency = cyclicInventoryFrequency ?? 0;

  if ((usage !== LOCATION_USAGE.INTERNAL && usage !== LOCATION_USAGE.TRANSIT) || frequency <= 0) {
    return null;
  }
  if (lastInventoryDate === null) {
    return addDays(today, frequency);
  }

  return frequency - daysBetween(lastInventoryDate, today) <= 0
    ? addDays(today, 1)
    : addDays(lastInventoryDate, frequency);
};

export const findLocationCycles = (locations: { id: string; locationId: string | null }[]) =>
  resolveTree(locations.map((location) => ({ id: location.id, parentId: location.locationId }))).cycles;

export const planLocationValues = ({
  locations,
  warehouses,
  rootIds,
  today,
}: {
  locations: LocationTreeRow[];
  warehouses: { id: string; viewLocationId: string | null; active: boolean }[];
  rootIds: string[];
  today: string;
}) => {
  const { chains } = resolveTree(locations.map((location) => ({ ...location, parentId: location.locationId })));
  const roots = new Set(rootIds);
  // Only active warehouses own locations.
  const warehouseByView = new Map(
    warehouses.filter((warehouse) => warehouse.active && warehouse.viewLocationId !== null).map((warehouse) => [warehouse.viewLocationId, warehouse.id]),
  );
  const updates: { id: string; data: Record<string, unknown> }[] = [];

  for (const location of locations) {
    const chain = chains.get(location.id);

    if (chain === undefined || !chain.some((link) => roots.has(link.id))) {
      continue;
    }
    let completeName = '';
    chain.forEach((link, index) => {
      completeName = index > 0 && link.usage !== LOCATION_USAGE.VIEW ? `${completeName}/${link.name ?? ''}` : (link.name ?? '');
    });
    const wanted: Record<string, unknown> = {
      completeName: textOrNull(completeName),
      parentPath: `${chain.map((link) => link.id).join('/')}/`,
      warehouseId: [...chain].reverse().map((link) => warehouseByView.get(link.id)).find((id) => id !== undefined) ?? null,
      nextInventoryDate: planNextInventoryDate({ ...location, today }),
    };
    if (location.usage !== LOCATION_USAGE.INTERNAL && location.replenishLocation) {
      wanted.replenishLocation = false;
    }
    const data = Object.fromEntries(
      Object.entries(wanted).filter(([field, value]) => location[field as keyof LocationTreeRow] !== value),
    );

    if (Object.keys(data).length > 0) {
      updates.push({ id: location.id, data });
    }
  }

  return updates;
};
