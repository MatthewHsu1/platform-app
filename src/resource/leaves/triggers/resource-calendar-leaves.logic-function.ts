import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberTimeZone } from 'src/resource/default-time-zone';
import { findStandardCalendarId } from 'src/resource/load-calendars';
import { resourceCalendarLeaves, resourceCalendars } from 'src/resource/resource-records';
import { RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/resource/resource-universal-identifiers.constant';
import { planLeaveDates } from 'src/resource/utils/plan-leave-dates.util';
import { isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';

type LeaveRecord = { id: string; dateFrom: string | null; dateTo: string | null; updatedBy?: { source?: string | null } | null };

const DATE_FIELDS = ['dateFrom', 'dateTo'] as const;

const readStandardTimeZone = async () => {
  const id = await findStandardCalendarId();

  if (id === null) {
    return null;
  }
  const [calendar] = await resourceCalendars.find<{ tz: string | null }>({ id: { eq: id } }, 'tz');

  return calendar?.tz ?? null;
};

// Fills the end of a time off and refuses one that ends before it starts. Only staff saves are looked at: the
// app's own writes already hold valid dates.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LeaveRecord>>) => {
  const { operation, events } = readEvents<LeaveRecord>(payload);
  const errors = errorCollector();

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }
  const now = new Date().toISOString();
  const standardTimeZone = await readStandardTimeZone();

  for (const event of events) {
    const after = eventAfter(event);

    if (after === undefined || !isStaffChange(operation, event, after)) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [current] = await resourceCalendarLeaves.find<LeaveRecord>({ id: { eq: event.recordId } }, 'id dateFrom dateTo');

      if (current === undefined) {
        return;
      }
      const written = new Set(
        operation === 'created' ? DATE_FIELDS.filter((field) => current[field] !== null) : updatedFieldsOf(event),
      );
      const plan = planLeaveDates({
        operation,
        dateFrom: current.dateFrom,
        dateTo: current.dateTo,
        written,
        memberTimeZone: await readMemberTimeZone(event.workspaceMemberId),
        standardTimeZone,
        now,
      });

      if (plan.kind === 'write') {
        if (Object.keys(plan.data).length > 0) {
          await resourceCalendarLeaves.update(event.recordId, plan.data);
        }

        return;
      }
      const reason = await localizedReason(event, plan.reason);

      if (operation === 'created') {
        // A new time off that is refused is removed; no record is left to hold a note, so the run's error says why.
        await resourceCalendarLeaves.destroyMany([event.recordId]);
        throw new Error(`The new time off was removed. ${reason}`);
      }
      const before = eventBefore(event);

      await putBack({
        objectSingular: resourceCalendarLeaves.objectSingular,
        objectPlural: resourceCalendarLeaves.objectPlural,
        recordId: event.recordId,
        data: Object.fromEntries(DATE_FIELDS.filter((field) => written.has(field)).map((field) => [field, before?.[field] ?? null])),
        reason,
      });
    });
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.leaves,
  name: 'platform-resource-calendar-leaves',
  description: 'Fills the end of a time off, and refuses one that ends before it starts (a new one is removed, a changed one is put back).',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'resourceCalendarLeave.*', batchMode: true },
});
