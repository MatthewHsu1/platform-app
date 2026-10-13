import { type makeClaims } from 'src/shared/claims/claim';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

export type ClaimedProcurementsDeps = {
  claims: Pick<ReturnType<typeof makeClaims>, 'withClaim' | 'openJournal' | 'heldClaimKeys'>;
  findClaim: (key: string) => Promise<ClaimRow | null>;
  // Plans (or takes the plan stored on the journal), commits right after, then writes.
  run: (procurements: Procurement[], journal: ClaimJournal, beforeCommit?: () => Promise<void>) => Promise<string[]>;
};
