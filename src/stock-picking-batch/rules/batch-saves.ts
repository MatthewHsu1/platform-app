import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { sameValue } from 'src/shared/utils/same-value.util';
import { assignBatchResponsible } from 'src/stock-picking-batch/assign-batch-responsible';
import { copyBatchScheduledDate, planBatchScheduledDateCopy } from 'src/stock-picking-batch/copy-batch-scheduled-date';
import { numberBatch } from 'src/stock-picking-batch/number-batch';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { BATCH_ROW, BATCH_OBJECT } from 'src/stock-picking-batch/rules/batch-row';
import { type BatchRow } from 'src/stock-picking-batch/types/batch-row.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';
import { shouldNameBatch } from 'src/stock-picking-batch/utils/plan-batch-naming.util';
import { shouldCopyBatchResponsible } from 'src/stock-picking-batch/utils/plan-responsible-copy.util';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { CANCELLED_SCHEDULED_DATE_MESSAGE } from 'src/stock/utils/plan-picking-rules.util';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

type BatchEvent = ObjectRecordEvent<BatchRow>;
type MemberRow = { id: string; name: string | null; state: string; pickingTypeId: string | null };

// The fields staff fill in; a refused save puts back all it changed.
const STAFF_FIELDS = ['pickingTypeId', 'responsibleId', 'scheduledDate', 'description', 'isWave'] as const;
// The fields the open batch and wave counts of an operation type depend on.
const COUNT_FIELDS = ['state', 'pickingTypeId', 'isWave'] as const;
const WATCHED_FIELDS = [...new Set<keyof BatchRow & string>([...STAFF_FIELDS, ...COUNT_FIELDS])];

const readBatch = async (id: string) => (await stockPickingBatches.find<BatchRow>({ id: { eq: id } }, BATCH_ROW))[0];

// A new operation type must fit every transfer already in the batch.
const typeRefusal = async (row: BatchRow) => {
  const pickings = await stockPickings.find<MemberRow>({ batchId: { eq: row.id } }, 'id name state pickingTypeId');
  const refused = incompatiblePickings(
    { name: row.name ?? '', state: row.state, pickingTypeId: row.pickingTypeId },
    pickings.map((picking) => ({ ...picking, name: picking.name ?? '' })),
  );

  return refused.length === 0 ? null : { batch: row.name ?? '', transfers: refused.join(', ') };
};

// The whole save is refused, so every staff field it changed that the row
// still holds goes back.
const putBackSave = async (
  event: BatchEvent,
  row: BatchRow,
  changed: string[],
  message: string,
  values?: TranslationValues,
) => {
  const before = eventBefore(event);
  const after = eventAfter(event);
  const data = Object.fromEntries(
    STAFF_FIELDS.filter((field) => changed.includes(field) && sameValue(row[field], after?.[field])).map((field) => [
      field,
      before?.[field] ?? null,
    ]),
  );

  await putBackForEvent({ ...BATCH_OBJECT, event, data, message, values });
};

const handleSave = async (event: BatchEvent, created: boolean, countTypeIds: Set<string>) => {
  const before = eventBefore(event);
  const after = eventAfter(event);

  if (after === undefined) {
    return;
  }
  const row = await readBatch(event.recordId);

  if (row === undefined) {
    return;
  }
  const changed = created ? [] : eventChangedFields(event, WATCHED_FIELDS);
  const staffChange = !isApplicationWrite(after);

  if (created || changed.some((field) => (COUNT_FIELDS as readonly string[]).includes(field))) {
    for (const typeId of [before?.pickingTypeId, after.pickingTypeId, row.pickingTypeId]) {
      if (typeId !== undefined && typeId !== null) {
        countTypeIds.add(typeId);
      }
    }
  }
  // An event the row has moved on from is left to the event of the later save.
  const typeCurrent = sameValue(row.pickingTypeId, after.pickingTypeId);

  if (!created && staffChange && changed.includes('pickingTypeId') && row.pickingTypeId !== null && typeCurrent) {
    const refusal = await typeRefusal(row);

    if (refusal !== null) {
      await putBackSave(event, row, changed, BATCH_MESSAGES.incompatible, refusal);
      return;
    }
  }
  // A date typed on the batch goes to its transfers once the save is accepted.
  const dateCopy =
    !created &&
    staffChange &&
    changed.includes('scheduledDate') &&
    row.scheduledDate !== null &&
    sameValue(row.scheduledDate, after.scheduledDate)
      ? await planBatchScheduledDateCopy(row.id, row.scheduledDate)
      : null;

  if (dateCopy?.refused === true) {
    await putBackSave(event, row, changed, CANCELLED_SCHEDULED_DATE_MESSAGE);
    return;
  }
  let name = row.name;

  if (
    typeCurrent &&
    row.pickingTypeId !== null &&
    shouldNameBatch({
      created,
      staffChange,
      pickingTypeId: row.pickingTypeId,
      pickingTypeIdBefore: before?.pickingTypeId ?? null,
      name: row.name,
      nameBefore: before?.name ?? null,
    })
  ) {
    const pickingTypeId = row.pickingTypeId;

    name = await numberBatch(row.id, {
      pickingTypeId,
      // A batch whose type or name moved on since this run read it was numbered by another pass.
      needsNumber: (current) => current.pickingTypeId === pickingTypeId && current.name === row.name,
      misconfiguredNote: created
        ? undefined
        : { id: derivedId('batchMisconfigured', row.id, after.updatedAt), locale: await readMemberLocale(event.workspaceMemberId) },
    });
  }
  // A put-back of a refused save writes the old responsible as the app; the
  // transfers never got the refused one, so there is nothing to copy back.
  if (
    shouldCopyBatchResponsible({
      created,
      responsibleSaved: staffChange && changed.includes('responsibleId'),
      responsibleId: row.responsibleId,
      pickingTypeId: row.pickingTypeId,
      name,
      nameRead: row.name,
    }) &&
    sameValue(row.responsibleId, after.responsibleId)
  ) {
    await assignBatchResponsible(
      { id: row.id, name: name ?? '', responsibleId: row.responsibleId },
      { saveKey: after.updatedAt, locale: await readMemberLocale(event.workspaceMemberId), createdBefore: after.updatedAt },
    );
  }
  if (dateCopy !== null && row.scheduledDate !== null) {
    await copyBatchScheduledDate(dateCopy.changed, row.scheduledDate);
  }
};

// Names a batch from its operation type, refuses a type its transfers do not
// fit, copies the responsible and a typed date onto the transfers, and notes
// the operation types whose open batch counts may have moved.
export const handleBatchSaves = async (
  events: BatchEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
  countTypeIds: Set<string>,
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  for (const event of events) {
    await errors.run(event.recordId, () => handleSave(event, operation === 'created', countTypeIds));
  }
};
