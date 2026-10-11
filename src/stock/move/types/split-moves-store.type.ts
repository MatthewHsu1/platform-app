import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type DoneMoveData } from 'src/stock/move/types/done-move-data.type';
import { type SplitMoveCreate } from 'src/stock/move/types/split-move-create.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type SplitMovesStore = {
  readMoves: (moveIds: string[]) => Promise<DoneMoveData[]>;
  uoms: () => Promise<Map<string, ResolvedUom>>;
  digits: () => number;
  newId: () => string;
  createSplitMoves: (moves: SplitMoveCreate[]) => Promise<void>;
  confirmMoves: (
    moveIds: string[],
    options: { merge: boolean; createProcurement: boolean; journal?: ClaimJournal },
  ) => Promise<string[]>;
  updateMoves: (updates: { id: string; data: Record<string, unknown> }[]) => Promise<void>;
  recomputeMove: (moveIds: string[]) => Promise<void>;
};
