import { type ValidateRunPicking } from 'src/stock/picking/types/validate-run-picking.type';

export type ValidateRunStore = {
  readPickingForRun: (pickingId: string) => Promise<ValidateRunPicking | null>;
  // The moves and lines whose owner changes, and those lines' source keys before and after the change.
  readOwnerChange: (moveIds: string[], ownerId: string) => Promise<{ moveIds: string[]; lineIds: string[]; keys: string[] }>;
  writeOwner: (args: { moveIds: string[]; lineIds: string[]; ownerId: string }) => Promise<void>;
  recomputeReserved: (keys: string[]) => Promise<void>;
  recomputePickingState: (pickingIds: string[]) => Promise<void>;
  updatePicking: (pickingId: string, data: Record<string, unknown>) => Promise<void>;
  now: () => string;
};
