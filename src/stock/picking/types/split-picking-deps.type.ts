import { type SplitMove } from 'src/stock/utils/types/split-move.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';

export type SplitPickingDeps = {
  digits: () => number;
  // The transfer's name and every move it holds, done and cancelled ones too; null when it is gone.
  readSplitSource: (pickingId: string) => Promise<{ name: string; moves: SplitMove[] } | null>;
  withClaim: <TResult>(
    key: ClaimKey,
    run: (runId: string) => Promise<TResult>,
  ) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;
  openJournal: (key: ClaimKey, runId: string) => Promise<ClaimJournal>;
  splitMoves: (moveIds: string[], journal: ClaimJournal, stepName: string) => Promise<string[]>;
  createBackorder: (pickingId: string, moveIds: string[] | null, journal: ClaimJournal, stepName: string) => Promise<string | null>;
};
