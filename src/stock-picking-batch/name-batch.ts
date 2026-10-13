import { nextNumberByCode } from 'src/base/sequence/next-number';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_SEQUENCE_CODE, WAVE_SEQUENCE_CODE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingTypes } from 'src/stock-picking-batch/stock-picking-batch-records';
import { batchName } from 'src/stock-picking-batch/utils/batch-name.util';

// The next batch or wave number with the operation type code. A renamed
// batch (misconfiguredNote given) gets a note when the sequence prefix has no
// "/"; a new batch does not.
export const nameBatch = async (
  batch: { id: string; isWave: boolean; pickingTypeId: string | null },
  { misconfiguredNote }: { misconfiguredNote?: { id: string; locale: string | null } } = {},
) => {
  const [type] =
    batch.pickingTypeId === null
      ? []
      : await stockPickingTypes.find<{ sequenceCode: string | null }>({ id: { eq: batch.pickingTypeId } }, 'sequenceCode');
  const code = batch.isWave ? WAVE_SEQUENCE_CODE : BATCH_SEQUENCE_CODE;
  const result = batchName({
    sequenceValue: (await nextNumberByCode(code)) ?? '',
    typeSequenceCode: type?.sequenceCode ?? '',
  });

  if (result.misconfigured && misconfiguredNote !== undefined) {
    const body = translate(misconfiguredNote.locale, BATCH_MESSAGES.misconfigured, { sequence: code });

    await addNote({ objectSingular: 'stockPickingBatch', recordId: batch.id, title: body, body, id: misconfiguredNote.id });
  }
  return result.name;
};
