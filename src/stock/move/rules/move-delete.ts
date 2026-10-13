import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readMoveLinks } from 'src/stock/move/move-links';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { eventBefore } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { moveDeleteRefusal } from 'src/stock/utils/plan-move-rules.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveLinks } from 'src/stock/move/types/move-links.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

const OBJECT = { objectSingular: 'stockMove', objectPlural: 'stockMoves' } as const;

const hasLinks = (links: MoveLinks, moveId: string) =>
  (links.origsOf.get(moveId) ?? []).length > 0 || (links.destsOf.get(moveId) ?? []).length > 0;

// Destroying the lines frees their reservation.
export const handleMoveDeletes = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'deleted') {
    return;
  }

  for (const event of events.filter((candidate) => isStaffDelete(candidate))) {
    const before = eventBefore(event);

    if (before === undefined) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const lines = await stockMoveLines.find<MoveLineRow>({ moveId: { eq: event.recordId } }, MOVE_LINE_ROW);
      const refusal = moveDeleteRefusal({
        state: before.state,
        hasLinks: hasLinks(await readMoveLinks([event.recordId]), event.recordId),
        hasDoneLines: lines.some((line) => line.state === MOVE_STATE.DONE),
      });

      if (refusal !== null) {
        await restoreForEvent({ ...OBJECT, event, message: refusal });
        return;
      }
      await stockMoveLines.destroyMany(lines.map((line) => line.id));
      await recomputeReserved([...new Set(lines.map((line) => sourceKeyOf(line)))]);
      await recomputePickingState(before.pickingId === null ? [] : [before.pickingId]);
      await recomputeProductQuantities([before.productId]);
    });
  }
};
