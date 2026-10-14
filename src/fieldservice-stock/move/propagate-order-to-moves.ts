import { planMoveOrder } from 'src/fieldservice-stock/utils/plan-move-order.util';
import { writeGrouped } from 'src/shared/triggers/write-grouped';
import { stockMoves, stockPickings } from 'src/stock/stock-records';

// A move of a transfer that names a service order names it too. `moveIds` are moves that were made or moved into
// a transfer; `pickingIds` are transfers whose order changed. Writes only the moves that differ.
export const propagateOrderToMoves = async ({ moveIds = [], pickingIds = [] }: { moveIds?: string[]; pickingIds?: string[] }) => {
  if (moveIds.length === 0 && pickingIds.length === 0) {
    return;
  }
  const moves = await stockMoves.find<{ id: string; pickingId: string | null; fsmOrderId: string | null }>(
    { or: [{ id: { in: moveIds } }, { pickingId: { in: pickingIds } }] },
    'id pickingId fsmOrderId',
  );
  const pickings = await stockPickings.find<{ id: string; fsmOrderId: string | null }>(
    { id: { in: moves.flatMap((move) => move.pickingId ?? []) } },
    'id fsmOrderId',
  );
  const orderOf = new Map(pickings.map((picking) => [picking.id, picking.fsmOrderId]));

  await writeGrouped(
    stockMoves,
    moves.flatMap((move) => {
      const orderId = planMoveOrder(move.pickingId === null ? null : (orderOf.get(move.pickingId) ?? null), move.fsmOrderId);

      return orderId === null ? [] : [{ id: move.id, data: { fsmOrderId: orderId } }];
    }),
  );
};
