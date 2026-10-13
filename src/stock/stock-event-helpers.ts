import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { isStaffChange } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { sameValue } from 'src/shared/utils/same-value.util';
import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

export const ACTOR_SELECTION = 'createdBy { source workspaceMemberId } updatedBy { source }';

export const eventBefore = <TRecord>(event: ObjectRecordEvent<TRecord>): TRecord | undefined =>
  'before' in event.properties ? (event.properties.before as TRecord) : undefined;

export const eventAfter = <TRecord>(event: ObjectRecordEvent<TRecord>): TRecord | undefined =>
  'after' in event.properties ? (event.properties.after as TRecord) : undefined;

export const localizedReason = async (
  event: { workspaceMemberId?: string },
  message: string,
  values?: TranslationValues,
) => translate(await readMemberLocale(event.workspaceMemberId), message, values);

// The event names who acted. When it does not, the row's creator stands in.
export const creatorMemberId = (event: { workspaceMemberId?: string }, row: ActorRow | undefined) =>
  event.workspaceMemberId ?? row?.createdBy?.workspaceMemberId ?? null;

export const eventChangedFields = <TRecord extends object, TField extends keyof TRecord & string>(
  event: ObjectRecordEvent<TRecord>,
  fields: TField[],
): TField[] => {
  const before = eventBefore(event);
  const after = eventAfter(event);

  if (before === undefined || after === undefined) {
    return [];
  }

  return fields.filter((field) => !sameValue(before[field], after[field]));
};

export const isStaffEvent = <TRecord extends ActorRow>(operation: RecordOperation, event: ObjectRecordEvent<TRecord>) =>
  isStaffChange(operation, event, eventAfter(event));

// The records a restore brought back, with the time each had been deleted.
export const restoredParents = <TRecord extends { deletedAt?: string | null }>(events: ObjectRecordEvent<TRecord>[]) =>
  events.map((event) => ({ id: event.recordId, deletedAt: eventBefore(event)?.deletedAt ?? null }));
