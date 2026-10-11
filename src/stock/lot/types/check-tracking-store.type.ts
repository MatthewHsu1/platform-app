import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';
import { type SerialQuant } from 'src/stock/utils/types/serial-quant.type';
import { type ValidateMove } from 'src/stock/utils/types/validate-move.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type CheckTrackingStore = {
  readLines: (pickingIds: string[]) => Promise<{ lines: ValidateLineRow[]; moves: ValidateMove[] }>;
  // Deleted lots too: Validate brings a deleted lot with the typed name back instead of making one.
  findLots: (productIds: string[], names: string[], lotIds: string[]) => Promise<{ id: string; name: string; productId: string }[]>;
  readSerialQuants: (lotIds: string[], productIds: string[]) => Promise<SerialQuant[]>;
  readLocations: (locationIds: string[]) => Promise<Map<string, { parentPath: string | null; usage: LocationUsage }>>;
  uoms: () => Promise<Map<string, ResolvedUom>>;
  digits: () => number;
  // The packages the lines touch with their containers and contents, and the names of the places involved.
  readPackageData: (
    packageIds: string[],
    locationIds: string[],
  ) => Promise<{
    nodes: Map<string, PackageNode>;
    packageQuants: { packageId: string; locationId: string; quantity: number }[];
    locationNames: Map<string, string>;
  }>;
};
