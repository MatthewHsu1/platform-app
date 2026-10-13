import { type ReturnData } from 'src/stock/picking/types/return-data.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';

type Row = Record<string, unknown> & { id: string };

export type ReturnPort = {
  digits: () => number;
  now: () => string;
  newId: () => string;
  readReturnData: (pickingId: string) => Promise<ReturnData>;
  nextPickingName: (sequenceId: string | null) => Promise<string>;
  withClaim: <TResult>(
    key: ClaimKey,
    run: (runId: string) => Promise<TResult>,
  ) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;
  openJournal: (key: ClaimKey, runId: string) => Promise<ClaimJournal>;
  unreserveMoves: (moveIds: string[]) => Promise<void>;
  createPickings: (rows: Row[]) => Promise<void>;
  createMoves: (rows: Row[]) => Promise<void>;
  createMoveLinks: (rows: Row[]) => Promise<void>;
  createReferenceLinks: (rows: Row[]) => Promise<void>;
  recompute: (pickingId: string, moveIds: string[]) => Promise<void>;
  addPickingNote: (pickingId: string, text: string) => Promise<void>;
  confirmAndAssign: (pickingId: string) => Promise<void>;
  runProcurements: (requests: ProcurementRequest[], options?: { journal?: ClaimJournal }) => Promise<void>;
  checkProcurements: (requests: ProcurementRequest[], options?: { journal?: ClaimJournal }) => Promise<void>;
};
