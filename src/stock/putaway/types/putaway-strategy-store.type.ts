import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type PutawayStrategyLine } from 'src/stock/putaway/types/putaway-strategy-line.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type PutawayStrategyStore = {
  readLines: (lineIds: string[]) => Promise<PutawayStrategyLine[]>;
  // Each product's unit, the units, and the product unit digits.
  readUnits: (productIds: string[]) => Promise<{ productUomIds: Map<string, string>; uoms: Map<string, ResolvedUom>; digits: number }>;
  readMoves: (moveIds: string[]) => Promise<{ id: string; locationDestId: string | null; packagingUomId: string | null }[]>;
  // Packages headed into another package.
  readHeadedPackages: () => Promise<{ id: string; packageDestId: string | null }[]>;
  readPackageTypes: (packageIds: string[]) => Promise<Map<string, string | null>>;
  putawayDestinations: (requests: PutawayRequest[]) => Promise<Map<string, string>>;
  writeDestination: (lineIds: string[], locationDestId: string) => Promise<void>;
};
