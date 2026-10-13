import { bypassesReservation, isLocationUnder } from 'src/stock/utils/location-usage.util';
import { type RoutingLocation } from 'src/stock/utils/procurement/types/routing-location.type';

// The location, then each parent up to the root.
export const locationChain = (locationId: string | null, locations: Map<string, RoutingLocation>) => {
  const chain: RoutingLocation[] = [];
  const seen = new Set<string>();
  let current = locationId === null ? undefined : locations.get(locationId);

  while (current !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = current.parentId === null ? undefined : locations.get(current.parentId);
  }

  return chain;
};

// An unknown location or an empty path has no place in the tree, so it is under nothing.
export const isRoutingLocationUnder = (child: RoutingLocation | undefined, ancestor: RoutingLocation | undefined) =>
  isLocationUnder(child?.parentPath || null, ancestor?.parentPath || null);

export const routingLocationBypassesReservation = (location: RoutingLocation | undefined) =>
  location !== undefined && bypassesReservation(location.usage);
