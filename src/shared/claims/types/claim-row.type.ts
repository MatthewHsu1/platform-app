import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';

export type ClaimRow = {
  id: string;
  key: string;
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  progress: ClaimProgress | null;
};
