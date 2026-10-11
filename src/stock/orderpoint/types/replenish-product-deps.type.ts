import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type ReplenishedMove } from 'src/stock/orderpoint/types/replenished-move.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

export type ReplenishProductDeps = {
  findClaim: (key: string) => Promise<ClaimRow | null>;
  resumeProcurementClaim: (key: string) => Promise<'done' | 'held'>;
  runClaimedProcurements: (key: string, procurements: Procurement[], options: { onReplay: () => void }) => Promise<string[]>;
  readFirstMove: (moveIds: string[]) => Promise<ReplenishedMove | null>;
};
