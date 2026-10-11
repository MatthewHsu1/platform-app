import { type BackorderSource } from 'src/stock/picking/types/backorder-source.type';
import { type BatchContext } from 'src/stock/picking/types/batch-context.type';

export type CreateBackorderStore = {
  readBackorderSource: (pickingId: string) => Promise<BackorderSource | null>;
  readPickingName: (pickingId: string) => Promise<string | null>;
  newId: () => string;
  recomputeMove: (moveIds: string[]) => Promise<void>;
  nextNumber: (sequenceId: string) => Promise<string>;
  createPicking: (pickingId: string, data: Record<string, unknown>) => Promise<void>;
  moveMovesToPicking: (moveIds: string[], pickingId: string) => Promise<void>;
  hasPickingNote: (pickingId: string, title: string) => Promise<boolean>;
  addPickingNote: (pickingId: string, text: string) => Promise<void>;
  recomputePickingState: (pickingIds: string[]) => Promise<void>;
  assignPickings: (pickingIds: string[]) => Promise<void>;
  checkEntirePack: (pickingIds: string[]) => Promise<void>;
  leaveBatchBeforeBackorder: (pickingIds: string[], context: BatchContext) => Promise<void>;
};
