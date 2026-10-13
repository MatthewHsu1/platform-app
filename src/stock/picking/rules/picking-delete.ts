import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { updateWhere } from 'src/shared/compare-and-set';
import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { includingDeleted } from 'src/shared/triggers/records';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { cancelMoves } from 'src/stock/move/actions/cancel-moves';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { DONE_MOVE_CANCEL_MESSAGE } from 'src/stock/utils/plan-picking-rules.util';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

const OBJECT = { objectSingular: 'stockPicking', objectPlural: 'stockPickings' } as const;

// A transfer with a done move (a done scrap move too: its done line
// cannot be deleted) comes back; else its moves are cancelled, then
// its lines and moves are destroyed.
export const handlePickingDeletes = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'deleted') {
    return;
  }

  for (const event of events.filter((candidate) => isStaffDelete(candidate))) {
    await errors.run(event.recordId, async () => {
      const moves = await stockMoves.find<{ id: string; state: string; productId: string }>(
        { pickingId: { eq: event.recordId } },
        'id state productId',
      );

      if (moves.some((move) => move.state === MOVE_STATE.DONE)) {
        await restoreForEvent({ ...OBJECT, event, message: DONE_MOVE_CANCEL_MESSAGE });
        return;
      }
      const live = moves.filter((move) => move.state !== MOVE_STATE.CANCEL).map((move) => move.id);

      if (live.length > 0) {
        await cancelMoves(live);
      }
      const lines = await stockMoveLines.find<{ id: string }>(
        {
          or: [
            { pickingId: { eq: event.recordId } },
            ...(moves.length > 0 ? [{ moveId: { in: moves.map((move) => move.id) } }] : []),
          ],
        },
        'id',
      );

      await stockMoveLines.destroyMany(lines.map((line) => line.id));
      await stockMoves.destroyMany(moves.map((move) => move.id));
      // The transfer itself stays in the trash locked, with no moves, so cancelled.
      // A by-id update does not reach a soft-deleted row, so the filter names deletedAt.
      await updateWhere({
        ...OBJECT,
        filter: includingDeleted({ id: { eq: event.recordId } }),
        data: { state: PICKING_STATE.CANCEL, isLocked: true },
      });
      await recomputeProductQuantities([...new Set(moves.map((move) => move.productId))]);
    });
  }
};
