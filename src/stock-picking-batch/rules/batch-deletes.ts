import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { BATCH_OBJECT, BATCH_ROW } from 'src/stock-picking-batch/rules/batch-row';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type BatchRow } from 'src/stock-picking-batch/types/batch-row.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { restoreForEvent } from 'src/stock/stock-put-back';

type BatchEvent = ObjectRecordEvent<BatchRow>;

// A done batch comes back from the trash; any other one lets its transfers
// go. A delete, restore or destroy also moves the open batch counts.
export const handleBatchDeletes = async (
  events: BatchEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
  countTypeIds: Set<string>,
) => {
  if (operation === 'restored' || operation === 'destroyed') {
    for (const event of events) {
      const typeId = (eventAfter(event) ?? eventBefore(event))?.pickingTypeId;

      if (typeId !== undefined && typeId !== null) {
        countTypeIds.add(typeId);
      }
    }
    return;
  }
  if (operation !== 'deleted') {
    return;
  }
  for (const event of events) {
    await errors.run(event.recordId, async () => {
      const [row] = await stockPickingBatches.findIncludingDeleted<BatchRow>({ id: { eq: event.recordId } }, BATCH_ROW);

      // Already back (or gone for good): nothing left to undo.
      if (row === undefined || row.deletedAt === null || row.deletedAt === undefined) {
        return;
      }
      if (row.state === BATCH_STATE.DONE) {
        await restoreForEvent({ ...BATCH_OBJECT, event, message: BATCH_MESSAGES.deleteDone });
        return;
      }
      if (row.pickingTypeId !== null) {
        countTypeIds.add(row.pickingTypeId);
      }
      const pickings = await stockPickings.find<{ id: string }>({ batchId: { eq: row.id } }, 'id');

      await stockPickings.updateMany(
        pickings.map((picking) => picking.id),
        { batchId: null },
      );
    });
  }
};
