import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';
import { type OrderFirstMove } from 'src/stock/orderpoint/types/order-first-move.type';
import { type OrderRow } from 'src/stock/orderpoint/types/order-row.type';
import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type ProcureResult } from 'src/stock/orderpoint/types/procure-result.type';
import { type SettledOrderRun } from 'src/stock/orderpoint/types/settled-order-run.type';

export type OrderOrderpointsDeps = {
  newRunId: () => string;
  takeClaims: (orderpointIds: string[], runId: string) => Promise<{ taken: string[]; busy: string[] }>;
  releaseClaims: (orderpointIds: string[], runId: string) => Promise<void>;
  // A click stopped by an error: frees the rules when nothing was written,
  // finishes the order for the rules a chunk wrote, or keeps every claim for
  // the resume.
  settleAfterError: (orderpointIds: string[], runId: string) => Promise<SettledOrderRun>;
  markChunk: (runId: string, orderpointIds: string[], procurementRunId: string) => Promise<void>;
  recompute: (orderpointIds: string[]) => Promise<{ failures: OrderpointFailure[] }>;
  readRows: (orderpointIds: string[]) => Promise<OrderRow[]>;
  procure: (
    orderpointIds: string[],
    options: {
      raiseUserError: true;
      runId: string;
      quantities: ReadonlyMap<string, number>;
      beforeWrite: () => Promise<void>;
      onChunkCommit: (orderpointIds: string[], procurementRunId: string) => Promise<void>;
    },
  ) => Promise<ProcureResult>;
  // As the clicking user: the trigger is a field staff own.
  setAutomatic: (orderpointIds: string[]) => Promise<void>;
  startFinish: (runId: string, plan: OrderFinishPlan) => Promise<void>;
  completeFinish: (runId: string, plan: OrderFinishPlan, revertIds: string[]) => Promise<void>;
  // For an order with nothing to order: no procurement, nothing to resume.
  finishWithoutOrder: (plan: OrderFinishPlan) => Promise<void>;
  readFirstMove: (moveIds: string[], orderpointIds: string[]) => Promise<OrderFirstMove | null>;
  digits: () => number;
};
