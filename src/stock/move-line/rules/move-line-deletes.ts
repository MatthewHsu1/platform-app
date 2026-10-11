import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { planMoveLineDelete } from 'src/stock/utils/plan-move-line-delete.util';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

const OBJECT = { objectSingular: 'stockMoveLine', objectPlural: 'stockMoveLines' } as const;

const distinct = (ids: (string | null)[]) => [...new Set(ids.flatMap((id) => (id === null ? [] : [id])))];

// Safe to run twice for the same lines (the move-line trigger runs it too): only rows still in the trash are
// destroyed, and the recomputes write only what differs.
export const freeDeletedOpenLines = async (lines: MoveLineRow[]) => {
  if (lines.length === 0) {
    return;
  }
  await stockMoveLines.destroySoftDeleted(lines.map((line) => line.id));
  await recomputeReserved(distinct(lines.map((line) => sourceKeyOf(line))));
  await recomputeMove(distinct(lines.map((line) => line.moveId)));
  await recomputePickingState(distinct(lines.map((line) => line.pickingId)));
  await recomputeProductQuantities(distinct(lines.map((line) => line.productId)));
};

// A deleted open line is destroyed (a soft-deleted line would come back on a restore and
// reserve again), then its key, move and transfer are recomputed.
export const handleMoveLineDeletes = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'deleted') {
    return;
  }
  const staffEvents = events.filter((event) => isStaffDelete(event));

  if (staffEvents.length === 0) {
    return;
  }

  const stored = await stockMoveLines.findIncludingDeleted<MoveLineRow & { deletedAt: string | null }>(
    { id: { in: staffEvents.map((event) => event.recordId) } },
    `${MOVE_LINE_ROW} deletedAt`,
  );
  const freed: MoveLineRow[] = [];

  for (const event of staffEvents) {
    const line = stored.find((candidate) => candidate.id === event.recordId);

    if (line === undefined || line.deletedAt === null) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const plan = planMoveLineDelete({ state: line.state });

      if (plan.kind === 'restore') {
        await restoreForEvent({ ...OBJECT, event, message: plan.reason });
        return;
      }
      freed.push(line);
    });
  }

  if (freed.length === 0) {
    return;
  }
  await errors.run('free', () => freeDeletedOpenLines(freed));
};
