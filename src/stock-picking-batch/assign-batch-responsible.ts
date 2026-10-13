import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { planResponsibleCopy } from 'src/stock-picking-batch/utils/plan-responsible-copy.util';

// The batch responsible goes to each of its transfers that has another one,
// with a note on each. The notes come first and have ids from the change
// (saveKey), so a rerun after a stop finds them instead of writing twice.
// `createdBefore` is the time of the save that asks for the copy: transfers
// made in the batch after it keep their own responsible.
export const assignBatchResponsible = async (
  batch: { id: string; name: string; responsibleId: string | null },
  { saveKey, locale = null, createdBefore }: { saveKey: string; locale?: string | null; createdBefore?: string },
) => {
  const pickings = await stockPickings.find<{ id: string; responsibleUserId: string | null; createdAt: string }>(
    { batchId: { eq: batch.id } },
    'id responsibleUserId createdAt',
  );
  const changed = planResponsibleCopy({ responsibleId: batch.responsibleId, pickings, createdBefore });

  if (changed.length === 0) {
    return;
  }
  const body = translate(locale, batch.responsibleId === null ? BATCH_MESSAGES.unassigned : BATCH_MESSAGES.assigned, {
    batch: batch.name,
  });

  for (const pickingId of changed) {
    await addNote({
      objectSingular: 'stockPicking',
      recordId: pickingId,
      title: body,
      body,
      id: derivedId('batchResponsible', batch.id, pickingId, saveKey),
    });
  }
  await stockPickings.updateMany(changed, { responsibleUserId: batch.responsibleId });
};
