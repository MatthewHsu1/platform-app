import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { applyMoveDateChange } from 'src/stock/move/rules/move-dates';
import { readPicking } from 'src/stock/picking/read-picking';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoves } from 'src/stock/stock-records';
import { CANCELLED_SCHEDULED_DATE_MESSAGE, planScheduledDateTyped } from 'src/stock/utils/plan-picking-rules.util';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

const OBJECT = { objectSingular: 'stockPicking', objectPlural: 'stockPickings' } as const;

// A typed scheduled date (inverse of the deadline) and a typed date done.
export const handlePickingDates = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);
    const changed = eventChangedFields(event, ['scheduledDate', 'dateDone']);

    if (before === undefined || after === undefined || changed.length === 0 || !isStaffEvent(operation, event)) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const picking = await readPicking(event.recordId);

      if (picking === undefined) {
        return;
      }
      const moves = await stockMoves.find<{ id: string; date: string | null; state: string }>(
        { pickingId: { eq: picking.id } },
        'id date state',
      );

      if (changed.includes('scheduledDate') && picking.scheduledDate === after.scheduledDate) {
        const plan = planScheduledDateTyped({ state: picking.state, scheduledDate: picking.scheduledDate, moves });

        if (plan.kind === 'refuse') {
          await putBackForEvent({
            ...OBJECT,
            event,
            data: { scheduledDate: before.scheduledDate },
            message: CANCELLED_SCHEDULED_DATE_MESSAGE,
          });
          return;
        }
        if (plan.moveIds.length > 0) {
          await stockMoves.updateMany(plan.moveIds, { date: picking.scheduledDate });
          await applyMoveDateChange(plan.moveIds);
        }
      }
      if (
        changed.includes('dateDone') &&
        picking.state === PICKING_STATE.DONE &&
        picking.dateDone !== null &&
        picking.dateDone === after.dateDone
      ) {
        const doneIds = moves
          .filter((move) => move.state === MOVE_STATE.DONE && move.date !== picking.dateDone)
          .map((move) => move.id);

        if (doneIds.length > 0) {
          await stockMoves.updateMany(doneIds, { date: picking.dateDone });
          await applyMoveDateChange(doneIds);
        }
      }
    });
  }
};
