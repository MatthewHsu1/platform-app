import { type AutoOrderpoint } from 'src/stock/orderpoint/types/auto-orderpoint.type';
import { type ConfirmedMove } from 'src/stock/orderpoint/types/confirmed-move.type';
import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type ProcureResult } from 'src/stock/orderpoint/types/procure-result.type';

export type OrderpointHookDeps = {
  readMoves: (moveIds: string[]) => Promise<ConfirmedMove[]>;
  readAutoOrderpoints: (productIds: string[]) => Promise<Omit<AutoOrderpoint, 'locationCompleteName'>[]>;
  readLocations: (locationIds: string[]) => Promise<{ id: string; parentPath: string | null; completeName: string | null }[]>;
  takeOrderpointClaims: (orderpointIds: string[], runId: string) => Promise<{ taken: string[]; busy: string[] }>;
  releaseOrderpointClaims: (orderpointIds: string[], runId: string) => Promise<void>;
  releaseOrderpointClaimsUnlessWritten: (orderpointIds: string[], runId: string) => Promise<void>;
  recomputeOrderpoint: (orderpointIds: string[]) => Promise<{ failures: OrderpointFailure[] }>;
  addIssueTasks: (failures: OrderpointFailure[]) => Promise<void>;
  procureOrderpoints: (
    orderpointIds: string[],
    options: { raiseUserError: boolean; runId: string; origins?: ReadonlyMap<string, string[]> },
  ) => Promise<ProcureResult>;
  newRunId: () => string;
};
