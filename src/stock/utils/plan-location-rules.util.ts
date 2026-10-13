import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

type LocationNode = { id: string; locationId: string | null };

type Refusal = { message: string; values: Record<string, string> };

export const LOCATION_RECURSION_MESSAGE = 'Recursion Detected.';
export const LOCATION_USED_BY_WAREHOUSE_MESSAGE =
  'You cannot archive location {location} because it is used by warehouse {warehouse}';
export const LOCATION_HOLDS_PRODUCTS_MESSAGE =
  "You can't disable locations {locations} because they still contain products.";
export const LOCATION_VIEW_WITH_PRODUCTS_MESSAGE =
  "This location's usage cannot be changed to view as it contains products.";
export const LOCATION_INTERNAL_WITH_STOCK_MESSAGE = "Internal locations having stock can't be converted";
export const REPLENISH_CONFLICT_MESSAGE =
  'Another parent/sub replenish location {location} exists, if you wish to change it, uncheck it first';

// Walks parent links, not stored paths: a path is stale while its own
// recompute is still to come.
export const subtreeIds = (rootId: string, rows: LocationNode[]) => {
  const childrenOf = new Map<string, string[]>();

  for (const row of rows) {
    if (row.locationId !== null) {
      childrenOf.set(row.locationId, [...(childrenOf.get(row.locationId) ?? []), row.id]);
    }
  }
  const found = [rootId];
  const seen = new Set(found);

  for (let index = 0; index < found.length; index += 1) {
    for (const childId of childrenOf.get(found[index]) ?? []) {
      if (!seen.has(childId)) {
        seen.add(childId);
        found.push(childId);
      }
    }
  }

  return found;
};

const ancestorsOrSelf = (locationId: string, rows: LocationNode[]) => {
  const parentOf = new Map(rows.map((row) => [row.id, row.locationId]));
  const chain = [locationId];
  const seen = new Set(chain);
  let current = parentOf.get(locationId) ?? null;

  while (current !== null && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }

  return chain;
};

export const isOwnAncestor = (locationId: string, rows: LocationNode[]) => {
  const parentOf = new Map(rows.map((row) => [row.id, row.locationId]));
  const seen = new Set<string>();
  let current = parentOf.get(locationId) ?? null;

  while (current !== null) {
    if (current === locationId) {
      return true;
    }
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }

  return false;
};

export const planActiveCascade = ({
  rootId,
  active,
  rows,
}: {
  rootId: string;
  active: boolean;
  rows: (LocationNode & { active: boolean })[];
}) => {
  const activeById = new Map(rows.map((row) => [row.id, row.active]));

  return subtreeIds(rootId, rows).filter((id) => id !== rootId && activeById.get(id) !== active);
};

export const locationArchiveRefusal = ({
  locationId,
  locationName,
  rows,
  warehouses,
  quants,
}: {
  locationId: string;
  locationName: string;
  rows: (LocationNode & { usage: LocationUsage; completeName: string | null; name: string | null })[];
  warehouses: { name: string | null; active: boolean; viewLocationId: string | null; lotStockId: string | null }[];
  quants: { locationId: string; quantity: number; reservedQuantity: number }[];
}): Refusal | null => {
  const warehouse = warehouses.find(
    (candidate) =>
      candidate.active && (candidate.viewLocationId === locationId || candidate.lotStockId === locationId),
  );

  if (warehouse !== undefined) {
    return {
      message: LOCATION_USED_BY_WAREHOUSE_MESSAGE,
      values: { location: locationName, warehouse: warehouse.name ?? '' },
    };
  }
  const subtree = new Set(subtreeIds(locationId, rows));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const names: string[] = [];

  for (const quant of quants) {
    const location = byId.get(quant.locationId);

    if (
      location === undefined ||
      !subtree.has(location.id) ||
      location.usage !== LOCATION_USAGE.INTERNAL ||
      (quant.quantity === 0 && quant.reservedQuantity === 0)
    ) {
      continue;
    }
    const name = location.completeName ?? location.name ?? '';

    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names.length === 0
    ? null
    : { message: LOCATION_HOLDS_PRODUCTS_MESSAGE, values: { locations: names.join(', ') } };
};

export const locationUsageRefusal = ({
  beforeUsage,
  afterUsage,
  quants,
}: {
  beforeUsage: LocationUsage;
  afterUsage: LocationUsage;
  quants: { quantity: number }[];
}): Refusal | null => {
  if (afterUsage === LOCATION_USAGE.VIEW && quants.length > 0) {
    return { message: LOCATION_VIEW_WITH_PRODUCTS_MESSAGE, values: {} };
  }
  if (beforeUsage !== afterUsage && quants.some((quant) => quant.quantity > 0)) {
    return { message: LOCATION_INTERNAL_WITH_STOCK_MESSAGE, values: {} };
  }

  return null;
};

// Another active replenish location whose parent is the location, one of its
// ancestors or one of its descendants.
export const replenishConflict = ({
  locationId,
  rows,
}: {
  locationId: string;
  rows: (LocationNode & { replenishLocation: boolean; active: boolean; name: string | null })[];
}): Refusal | null => {
  const location = rows.find((row) => row.id === locationId);

  if (location === undefined || !location.replenishLocation) {
    return null;
  }
  const scope = new Set([...ancestorsOrSelf(locationId, rows), ...subtreeIds(locationId, rows)]);
  const conflict = rows.find(
    (row) =>
      row.id !== locationId &&
      row.replenishLocation &&
      row.active &&
      row.locationId !== null &&
      scope.has(row.locationId),
  );

  return conflict === undefined
    ? null
    : { message: REPLENISH_CONFLICT_MESSAGE, values: { location: conflict.name ?? '' } };
};

export const planLocationDelete = ({
  deletedId,
  rows,
  usedLocationIds,
}: {
  deletedId: string;
  rows: LocationNode[];
  usedLocationIds: string[];
}): { kind: 'refuse' } | { kind: 'cascade'; childIds: string[] } => {
  const subtree = subtreeIds(deletedId, rows);
  const used = new Set(usedLocationIds);

  return subtree.some((id) => used.has(id))
    ? { kind: 'refuse' }
    : { kind: 'cascade', childIds: subtree.filter((id) => id !== deletedId) };
};
