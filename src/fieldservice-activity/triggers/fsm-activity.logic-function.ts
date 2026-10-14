import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { fsmActivities } from 'src/fieldservice-activity/fieldservice-activity-records';
import { FIELDSERVICE_ACTIVITY_MESSAGES } from 'src/fieldservice-activity/fieldservice-activity-messages.constant';
import { FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { type ActivityLockFields } from 'src/fieldservice-activity/types/activity-lock-fields.type';
import { planActivityLock } from 'src/fieldservice-activity/utils/plan-activity-lock.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';

type ActivityEvent = ObjectRecordEvent<ActivityLockFields & { updatedBy?: { source?: string | null } | null }>;

// A completed or cancelled activity keeps its name, required flag and reference: a person's change to them is
// undone with a note. The row is read again, so only what still differs goes back, and the app's own writes (the
// buttons, the put-back itself) are skipped.
const lockSettledActivities = async (events: ActivityEvent[]) => {
  const ids = [...new Set(events.map((event) => event.recordId))];
  const current = new Map(
    (await fsmActivities.find<ActivityLockFields & { id: string }>({ id: { in: ids } }, 'id name required ref state')).map((row) => [row.id, row]),
  );
  const errors = errorCollector();

  for (const id of ids) {
    const saves = events.filter((event) => event.recordId === id);
    const before = eventBefore(saves[0]);
    const row = current.get(id);

    if (before === undefined || row === undefined) {
      continue;
    }
    const putBack = planActivityLock({
      before,
      current: row,
      written: saves.flatMap((event) => updatedFieldsOf(event)),
      staffSave: saves.some((event) => !isApplicationWrite(eventAfter(event))),
    });

    if (putBack !== null) {
      await errors.run(id, () =>
        putBackForEvent({
          objectSingular: 'fsmActivity',
          objectPlural: 'fsmActivities',
          event: saves[saves.length - 1],
          data: putBack,
          message: FIELDSERVICE_ACTIVITY_MESSAGES.lockedActivity,
        }),
      );
    }
  }
  errors.throwIfAny();
};

const handler = async (payload: DatabaseEventBatchPayload<ActivityEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'updated') {
    await lockSettledActivities(events);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmActivity,
  name: 'platform-fsm-activity',
  description: 'Undoes a change to the name, required flag or reference of a completed or cancelled activity.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmActivity.*', batchMode: true },
});
