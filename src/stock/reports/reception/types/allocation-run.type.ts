import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { type AllocatePlan } from 'src/stock/utils/types/allocate-plan.type';
import { type AllocationLineWrite } from 'src/stock/utils/types/allocation-line-write.type';
import { type UnallocatePlan } from 'src/stock/utils/types/unallocate-plan.type';

// A planned Allocate or Unallocate, stored on its first claim before any write
// with the id of every row it makes, so a stopped run is finished from it.
// `memberKeys` are the other transfers it holds, taken by `claimRunId`.
export type AllocationRun =
  | {
      kind: 'allocate';
      memberKeys: string[];
      claimRunId: string;
      plan: AllocatePlan;
      splits: MoveSplitPlan[];
      lineWrites: AllocationLineWrite[];
    }
  | {
      kind: 'unallocate';
      memberKeys: string[];
      claimRunId: string;
      plan: UnallocatePlan;
      split: MoveSplitPlan | null;
      lineWrites: AllocationLineWrite[];
    };
