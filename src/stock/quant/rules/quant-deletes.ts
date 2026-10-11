import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type QuantEventRecord } from 'src/stock/quant/types/quant-event-record.type';
import { restoreForEvent } from 'src/stock/stock-put-back';

export const QUANT_DELETE_REASON =
  'Quants are auto-deleted when appropriate. If you must manually delete them, please ask a stock manager to do it.';

// Only the zero-row cleanup removes stock rows (it destroys them, a different event), so
// every staff delete comes back.
export const handleQuantDeletes = async (
  events: ObjectRecordEvent<QuantEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'deleted') {
    return;
  }
  for (const event of events.filter((candidate) => isStaffDelete(candidate))) {
    await errors.run(event.recordId, () =>
      restoreForEvent({
        objectSingular: 'stockQuant',
        objectPlural: 'stockQuants',
        event,
        message: QUANT_DELETE_REASON,
      }),
    );
  }
};
