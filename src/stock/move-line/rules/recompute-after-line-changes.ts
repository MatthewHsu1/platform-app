import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { stockMoves } from 'src/stock/stock-records';

type RecomputeAfterLineChangesDeps = {
  recomputeReserved: (keys: string[]) => Promise<void>;
  recomputeMove: (moveIds: string[]) => Promise<void>;
  readPickingIds: (moveIds: string[]) => Promise<string[]>;
  recomputePickingState: (pickingIds: string[]) => Promise<void>;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
};

// The derived values of lines staff made or changed, in the order the writers depend on each other: reserved
// quantity, the moves, their transfers, then the product totals. A staff line may reserve more than a key holds (a
// lot typed before its stock exists): only a reservation run cuts lines back, so the line is kept.
export const makeRecomputeAfterLineChanges =
  (deps: RecomputeAfterLineChangesDeps) =>
  async ({ keys, moveIds, productIds }: { keys: string[]; moveIds: string[]; productIds: string[] }) => {
    await deps.recomputeReserved(keys);
    const recomputed = [...new Set(moveIds)];

    await deps.recomputeMove(recomputed);
    if (recomputed.length > 0) {
      await deps.recomputePickingState(await deps.readPickingIds(recomputed));
    }
    if (keys.length > 0 || recomputed.length > 0) {
      await deps.recomputeProductQuantities([...new Set(productIds)]);
    }
  };

export const recomputeAfterLineChanges = makeRecomputeAfterLineChanges({
  recomputeReserved,
  recomputeMove,
  readPickingIds: async (moveIds) => {
    const moves = await stockMoves.find<{ pickingId: string | null }>({ id: { in: moveIds } }, 'pickingId');

    return [...new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))];
  },
  recomputePickingState,
  recomputeProductQuantities,
});
