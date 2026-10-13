import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { recomputeHoursPerDay } from 'src/resource/recompute-hours-per-day';
import { RESOURCE_MESSAGES } from 'src/resource/resource-messages.constant';
import { resourceCalendarAttendances, resourceCalendars } from 'src/resource/resource-records';
import { RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/resource/resource-universal-identifiers.constant';
import { planAttendanceUndo } from 'src/resource/utils/plan-attendance-undo.util';
import { isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { groupBy } from 'src/shared/utils/group-by.util';
import { eventAfter, eventBefore, eventChangedFields, localizedReason } from 'src/stock/stock-event-helpers';

type LineRecord = {
  id: string;
  calendarId: string | null;
  dayofweek: string | null;
  hourFrom: number | null;
  hourTo: number | null;
  weekType: string | null;
  updatedBy?: { source?: string | null } | null;
};

// The fields whose change can make working times overlap, and with them the average hours per day.
const SCHEDULE_FIELDS = ['dayofweek', 'hourFrom', 'hourTo', 'weekType', 'calendarId'] as const;
const AVERAGE_FIELDS = ['hourFrom', 'hourTo', 'calendarId'] as const;

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LineRecord>>) => {
  const { operation, events } = readEvents<LineRecord>(payload);
  const errors = errorCollector();
  const calendarsToAverage = new Set<string>();
  const removals: string[] = [];

  // Working times of one calendar may not overlap. A line staff create that overlaps is removed; one staff
  // change is put back.
  if (operation === 'created' || operation === 'updated') {
    const staffEvents = events.filter((event) => {
      const after = eventAfter(event);

      return after !== undefined && after.calendarId !== null && isStaffChange(operation, event, after);
    });

    for (const [calendarId, calendarEvents] of groupBy(staffEvents, (event) => String(eventAfter(event)?.calendarId))) {
      await errors.run(calendarId, async () => {
        const [calendar] = await resourceCalendars.find<{ twoWeeksCalendar: boolean | null }>({ id: { eq: calendarId } }, 'twoWeeksCalendar');
        const stored = await resourceCalendarAttendances.find<{
          id: string;
          dayofweek: string;
          hourFrom: number;
          hourTo: number;
          weekType: string | null;
        }>({ calendarId: { eq: calendarId } }, 'id dayofweek hourFrom hourTo weekType');
        const undo = planAttendanceUndo({
          twoWeeksCalendar: calendar?.twoWeeksCalendar === true,
          stored,
          savedLineIds: calendarEvents.map((event) => event.recordId),
        });

        for (const lineId of undo) {
          const event = calendarEvents.find((candidate) => candidate.recordId === lineId);
          const before = event === undefined ? undefined : eventBefore(event);

          if (event === undefined) {
            continue;
          }
          const reason = await localizedReason(event, RESOURCE_MESSAGES.attendanceOverlap);

          if (operation === 'created' || before === undefined) {
            await resourceCalendarAttendances.destroyMany([lineId]);
            removals.push(`The new working time was removed. ${reason}`);
          } else {
            await putBack({
              objectSingular: resourceCalendarAttendances.objectSingular,
              objectPlural: resourceCalendarAttendances.objectPlural,
              recordId: lineId,
              data: Object.fromEntries(eventChangedFields(event, [...SCHEDULE_FIELDS]).map((field) => [field, before[field]])),
              reason,
            });
          }
        }
      });
    }
  }

  // The average hours per day follow the hours and the calendar of the lines.
  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);
    const moved = operation !== 'updated' || eventChangedFields(event, [...AVERAGE_FIELDS]).length > 0;

    if (moved) {
      for (const calendarId of [before?.calendarId, after?.calendarId]) {
        if (calendarId !== null && calendarId !== undefined) {
          calendarsToAverage.add(calendarId);
        }
      }
    }
  }
  if (calendarsToAverage.size > 0) {
    await errors.run('hours per day', () => recomputeHoursPerDay([...calendarsToAverage]));
  }
  // A removed line leaves no record to hold a note, so the run's error says why.
  if (removals.length > 0) {
    await errors.run('refused working times', async () => {
      throw new Error(removals.join(' '));
    });
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.attendance,
  name: 'platform-resource-calendar-attendance',
  description:
    'Refuses working times that overlap in one calendar (a new one is removed, a changed one is put back) and keeps the average hours per day of its calendar right.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'resourceCalendarAttendance.*', batchMode: true },
});
