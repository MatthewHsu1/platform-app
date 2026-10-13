import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { stockMoves } from 'src/stock/stock-records';
import { planReservationDates } from 'src/stock/utils/plan-picking-type-rules.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';

// Open moves of the type get or lose their reservation date.
export const handlePickingTypeReservation = async (
  events: ObjectRecordEvent<PickingTypeEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (
      before === undefined ||
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['reservationMethod']).includes('reservationMethod')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const moves = await stockMoves.find<{
        id: string;
        state: MoveState;
        date: string | null;
        priority: Priority;
        reservationDate: string | null;
      }>({ pickingTypeId: { eq: event.recordId } }, 'id state date priority reservationDate');
      const changes = planReservationDates({
        before: before.reservationMethod,
        after: after.reservationMethod,
        daysBefore: after.reservationDaysBefore,
        daysBeforePriority: after.reservationDaysBeforePriority,
        moves,
      });
      const idsByDate = new Map<string | null, string[]>();

      for (const change of changes) {
        idsByDate.set(change.reservationDate, [...(idsByDate.get(change.reservationDate) ?? []), change.id]);
      }
      for (const [reservationDate, ids] of idsByDate) {
        await stockMoves.updateMany(ids, { reservationDate });
      }
    });
  }
};
