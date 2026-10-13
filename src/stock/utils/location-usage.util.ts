import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

const BYPASS_USAGES = new Set<LocationUsage>([
  LOCATION_USAGE.SUPPLIER,
  LOCATION_USAGE.CUSTOMER,
  LOCATION_USAGE.INVENTORY,
  LOCATION_USAGE.PRODUCTION,
]);

// Stock taken from these locations is never reserved.
export const bypassesReservation = (usage: LocationUsage) => BYPASS_USAGES.has(usage);

// Paths end with '/', so a sibling whose id starts the same is not "under".
export const isLocationUnder = (childParentPath: string | null, ancestorParentPath: string | null) =>
  childParentPath !== null && ancestorParentPath !== null && childParentPath.startsWith(ancestorParentPath);
