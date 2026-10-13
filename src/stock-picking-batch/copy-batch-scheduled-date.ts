import { sameValue } from 'src/shared/utils/same-value.util';
import { stockMoves, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { applyMoveDateChange } from 'src/stock/move/rules/move-dates';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { planScheduledDateTyped } from 'src/stock/utils/plan-picking-rules.util';

type DatedPicking = { id: string; state: PickingState; scheduledDate: string | null };

// The transfers a date typed on a batch would change. A cancelled transfer
// refuses a new date, so the whole change is refused when one would change.
export const planBatchScheduledDateCopy = async (batchId: string, scheduledDate: string) => {
  const pickings = await stockPickings.find<DatedPicking>({ batchId: { eq: batchId } }, 'id state scheduledDate');
  const changed = pickings.filter((picking) => !sameValue(picking.scheduledDate, scheduledDate));

  return { refused: changed.some((picking) => picking.state === PICKING_STATE.CANCEL), changed };
};

// The date goes to the transfers and, as a date typed on a transfer does, to
// the moves of the ones not done. Moves go first: a rerun after a stop still
// finds the transfers to date.
export const copyBatchScheduledDate = async (changed: DatedPicking[], scheduledDate: string) => {
  if (changed.length === 0) {
    return;
  }
  const moves = await stockMoves.find<{ id: string; pickingId: string; date: string | null }>(
    { pickingId: { in: changed.map((picking) => picking.id) } },
    'id pickingId date',
  );
  const moveIds = changed.flatMap((picking) => {
    const plan = planScheduledDateTyped({
      state: picking.state,
      scheduledDate,
      moves: moves.filter((move) => move.pickingId === picking.id),
    });

    return plan.kind === 'apply' ? plan.moveIds : [];
  });

  if (moveIds.length > 0) {
    await stockMoves.updateMany(moveIds, { date: scheduledDate });
    await applyMoveDateChange(moveIds);
  }
  await stockPickings.updateMany(
    changed.map((picking) => picking.id),
    { scheduledDate },
  );
};
