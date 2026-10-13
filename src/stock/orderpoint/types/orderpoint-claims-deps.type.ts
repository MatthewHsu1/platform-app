import { type makeClaims } from 'src/shared/claims/claim';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';

export type OrderpointClaimsDeps = {
  claims: Pick<
    ReturnType<typeof makeClaims>,
    'takeClaims' | 'releaseClaim' | 'releaseClaims' | 'findStaleClaims' | 'withClaim' | 'openJournal' | 'isStaleClaim'
  >;
  findClaim: (key: string) => Promise<ClaimRow | null>;
  resumeProcurementClaim: (key: string) => Promise<'done' | 'held'>;
  isProcurementClaimCommitted: (key: string) => Promise<boolean>;
  finishOrder: (plan: OrderFinishPlan, revertIds?: string[]) => Promise<void>;
  revertAutomatic: (orderpointIds: string[]) => Promise<void>;
};
