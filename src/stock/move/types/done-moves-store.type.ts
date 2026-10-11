import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type SplitMovesStore } from 'src/stock/move/types/split-moves-store.type';
import { type LotCompensation } from 'src/stock/lot/types/lot-compensation.type';
import { type PackagesAfterDonePlan } from 'src/stock/package/types/packages-after-done-plan.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';

export type DoneMovesStore = SplitMovesStore & {
  now: () => string;
  cancelMoves: (moveIds: string[]) => Promise<void>;
  destroyLines: (lineIds: string[]) => Promise<void>;
  commitLine: (lineId: string, date: string) => Promise<void>;
  applyQuantDelta: (args: { key: string; delta: number; inDate: string | null }) => Promise<{ quantId: string; quantity: number; inDate: string }>;
  settleQuantDelta: (args: { key: string; delta: number; inDate: string | null }) => Promise<{ inDate: string | null }>;
  recomputeReserved: (keys: string[]) => Promise<void>;
  readAvailable: (key: string) => Promise<number>;
  planReservationRelease: (args: { key: string; shortfall: number; pickingId: string | null; ignoreLineIds: string[] }) => Promise<FreeReservationPlan>;
  releaseReservation: (key: string, plan: FreeReservationPlan) => Promise<void>;
  readLotCompensation: (id: string) => Promise<LotCompensation | null>;
  // false when a row with this id is already there.
  createLotCompensation: (row: LotCompensation) => Promise<boolean>;
  applyTrackingOnDone: (lineIds: string[], options: { skipPackageHistory: boolean }) => Promise<void>;
  planPackagesAfterDone: (
    lineIds: string[],
    options: { skipContainers: boolean; siblingPickingIds: string[] },
  ) => Promise<PackagesAfterDonePlan>;
  applyPackagesAfterDone: (plan: PackagesAfterDonePlan) => Promise<void>;
  recomputePickingState: (pickingIds: string[]) => Promise<void>;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
  recomputeTrackingForKeys: (keys: string[]) => Promise<void>;
  pushApply: (moveIds: string[], options?: { journal?: ClaimJournal }) => Promise<void>;
  readOpenDestinationMoveIds: (moveIds: string[]) => Promise<string[]>;
  assignMoves: (moveIds: string[]) => Promise<void>;
  retryWaitingMoves: (moveIds: string[]) => Promise<void>;
};
