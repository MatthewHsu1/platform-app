import { type makeClaims } from 'src/shared/claims/claim';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { type AllocationInputs } from 'src/stock/reports/reception/types/allocation-inputs.type';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type AllocationLineWrite } from 'src/stock/utils/types/allocation-line-write.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

type Claims = ReturnType<typeof makeClaims>;

type MovePair = { moveOrigId: string; moveDestId: string };

// What Allocate and Unallocate read and write, so they can run on the real
// records or on rows in memory. Every write sets planned values, so running
// it again changes nothing.
export type AllocationPort = {
  claims: Pick<Claims, 'withClaim' | 'openJournal' | 'takeClaims' | 'releaseClaims' | 'settleOwnedClaim' | 'heldClaimKeys'>;
  digits: () => number;
  uoms: () => Promise<Map<string, ResolvedUom>>;
  readMovePickingIds: (moveIds: string[]) => Promise<Map<string, string | null>>;
  readInputs: (request: AllocationRequest) => Promise<AllocationInputs>;
  planMoveSplit: (moveId: string, quantity: number, target: { newMoveId: string }) => Promise<MoveSplitPlan>;
  applyMoveSplit: (plan: MoveSplitPlan) => Promise<unknown>;
  writeLines: (writes: AllocationLineWrite[]) => Promise<void>;
  linkMoves: (pairs: MovePair[]) => Promise<void>;
  unlinkMoves: (pairs: MovePair[]) => Promise<void>;
  setProcureMethod: (moveIds: string[], procureMethod: ProcureMethod) => Promise<void>;
  addReferences: (pickingId: string, referenceIds: string[]) => Promise<void>;
  removeReferences: (pickingId: string, referenceIds: string[]) => Promise<void>;
  // Moves' derived values, then the reservation of the lines that changed.
  recompute: (moveIds: string[], lineIds: string[]) => Promise<void>;
  assignMoves: (moveIds: string[]) => Promise<void>;
  unreserveMoves: (moveIds: string[]) => Promise<void>;
};
