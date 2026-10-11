import { putBack, restoreWithNote } from 'src/shared/triggers/put-back';
import { localizedReason } from 'src/stock/stock-event-helpers';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

type EventActor = { recordId: string; workspaceMemberId?: string };

// Put-back notes in the language of the member who made the refused change.
export const putBackForEvent = async ({
  objectSingular,
  objectPlural,
  event,
  data,
  message,
  values,
}: {
  objectSingular: string;
  objectPlural: string;
  event: EventActor;
  data: Record<string, unknown>;
  message: string;
  values?: TranslationValues;
}) =>
  putBack({ objectSingular, objectPlural, recordId: event.recordId, data, reason: await localizedReason(event, message, values) });

export const restoreForEvent = async ({
  objectSingular,
  objectPlural,
  event,
  message,
  values,
}: {
  objectSingular: string;
  objectPlural: string;
  event: EventActor;
  message: string;
  values?: TranslationValues;
}) =>
  restoreWithNote({ objectSingular, objectPlural, recordId: event.recordId, reason: await localizedReason(event, message, values) });
