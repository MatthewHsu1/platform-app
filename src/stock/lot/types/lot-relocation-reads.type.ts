import { type LocationUsage } from 'src/stock/types/location-usage.type';

export type LotRelocationReads = {
  // The lots' rows holding positive stock.
  readLotQuants: (
    lotIds: string[],
  ) => Promise<{ id: string; lotId: string; locationId: string; quantity: number; packageId: string | null }[]>;
  // Per package: its rows that hold stock or a reservation.
  readPackageQuantCounts: (packageIds: string[]) => Promise<Map<string, number>>;
  readLotLocations: (lotIds: string[]) => Promise<Map<string, string | null>>;
  readLocations: (ids: string[]) => Promise<Map<string, { usage: LocationUsage; completeName: string | null }>>;
};
