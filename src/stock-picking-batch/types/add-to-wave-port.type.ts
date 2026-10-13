import { type makeClaims } from 'src/shared/claims/claim';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';

type Claims = ReturnType<typeof makeClaims>;

type ChosenLine = { id: string; pickingId: string | null; moveId: string | null; quantityProductUom: number };

type WavePicking = {
  id: string;
  name: string;
  state: string;
  pickingTypeId: string | null;
  batchId: string | null;
  // What a transfer split off this one copies.
  copyValues: Record<string, unknown>;
};

// What Add to wave reads and writes, so it can run on the real records or on rows in memory.
export type AddToWavePort = {
  claims: Pick<Claims, 'withClaim' | 'openJournal' | 'takeClaims' | 'releaseClaims' | 'settleOwnedClaim'>;
  digits: () => number;
  // In the order of the ids asked for; the quantity is in the product unit.
  readLines: (lineIds: string[]) => Promise<ChosenLine[]>;
  // The transfers with every line and move they hold, done and cancelled ones too.
  readPickings: (pickingIds: string[]) => Promise<{
    pickings: WavePicking[];
    lines: { id: string; pickingId: string; moveId: string | null }[];
    moves: { id: string; pickingId: string }[];
  }>;
  // Undefined when the batch is gone or the user cannot read it.
  readWave: (
    waveId: string,
  ) => Promise<{ id: string; name: string; state: BatchState; isWave: boolean; pickingTypeId: string | null } | undefined>;
  planMoveSplit: (moveId: string, quantity: number, target: { lineIds: string[]; pickingId: string }) => Promise<MoveSplitPlan>;
  // Makes the wave unless a stopped run made it.
  createWave: (
    waveId: string,
    values: { isWave: true; pickingTypeId: string | null; responsibleId: string | null; description: string | null },
  ) => Promise<void>;
  // An open wave with no operation type takes the type of the lines joining it; a type set meanwhile stays.
  typeWave: (waveId: string, pickingTypeId: string) => Promise<void>;
  joinWave: (pickingIds: string[], waveId: string) => Promise<void>;
  // Makes the transfer, with its own number, unless a stopped run made it.
  createSplitPicking: (pickingId: string, values: Record<string, unknown>) => Promise<void>;
  moveToPicking: (moveIds: string[], lineIds: string[], pickingId: string) => Promise<void>;
  applyMoveSplit: (plan: MoveSplitPlan) => Promise<string>;
  recomputePickingState: (pickingIds: string[]) => Promise<void>;
  // The wave's operation type confirms its waves; an untyped wave takes `fallbackTypeId`.
  readAutoConfirm: (waveId: string, fallbackTypeId: string | null) => Promise<boolean>;
  confirmBatch: (batchId: string) => Promise<void>;
  recomputeBatchState: (batchIds: string[]) => Promise<void>;
  readBatchName: (batchId: string) => Promise<string>;
};
