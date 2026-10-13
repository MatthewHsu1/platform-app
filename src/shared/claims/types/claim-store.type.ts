import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';

type NewClaim = { key: string; runId: string; startedAt: string; progress?: ClaimProgress };

export type ClaimStore = {
  create: (row: NewClaim) => Promise<'created' | 'exists'>;
  // 'exists' when the unique key refused a row.
  createMany: (rows: NewClaim[]) => Promise<'created' | 'exists'>;
  findByKey: (key: string) => Promise<ClaimRow | null>;
  findByKeys: (keys: string[]) => Promise<ClaimRow[]>;
  updateWhere: (
    match: { key: string; runId: string },
    data: Partial<Pick<ClaimRow, 'runId' | 'startedAt' | 'finishedAt' | 'progress'>>,
  ) => Promise<boolean>;
  destroy: (match: { key: string; runId?: string }) => Promise<void>;
  destroyMany: (match: { keys: string[]; runId: string }) => Promise<void>;
  findStale: (startedBefore: string) => Promise<ClaimRow[]>;
  // Removes the rows whose run finished before then; a row taken over meanwhile is no longer finished and stays.
  destroyFinished: (finishedBefore: string) => Promise<void>;
  now: () => Date;
  newRunId: () => string;
};
