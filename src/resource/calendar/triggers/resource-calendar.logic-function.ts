import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import 'src/helpdesk-sla/calendar-team-delete-entries';
import { CALENDAR_DELETE_RULES } from 'src/resource/calendar/calendar-delete-rules';
import { defaultTimeZone } from 'src/resource/default-time-zone';
import { findStandardCalendarId } from 'src/resource/load-calendars';
import { recomputeHoursPerDay } from 'src/resource/recompute-hours-per-day';
import { STANDARD_WORKING_LINES } from 'src/resource/resource-install';
import { RESOURCE_MESSAGES } from 'src/resource/resource-messages.constant';
import { resourceCalendarAttendances, resourceCalendars } from 'src/resource/resource-records';
import { RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/resource/resource-universal-identifiers.constant';
import { planCalendarCreate } from 'src/resource/utils/plan-calendar-create.util';
import { isKnownTimeZone } from 'src/resource/utils/time-zone.util';
import { isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore, eventChangedFields, localizedReason, restoredParents } from 'src/stock/stock-event-helpers';

type CalendarRecord = {
  id: string;
  tz: string | null;
  twoWeeksCalendar: boolean | null;
  seedKey: string | null;
  deletedAt?: string | null;
  updatedBy?: { source?: string | null } | null;
};

type LineNode = {
  name: string | null;
  dayofweek: string;
  hourFrom: number;
  hourTo: number;
  dayPeriod: string;
  weekType: string | null;
  sequence: number;
};

const LINE_SELECTION = 'name dayofweek hourFrom hourTo dayPeriod weekType sequence';

// The standard calendar's own working times; the first install's values when it has none stored.
const readStandard = async () => {
  const id = await findStandardCalendarId();

  if (id === null) {
    return null;
  }
  const [calendar] = await resourceCalendars.find<{ id: string; tz: string | null; twoWeeksCalendar: boolean | null }>({ id: { eq: id } }, 'id tz twoWeeksCalendar');
  const stored = await resourceCalendarAttendances.find<LineNode>({ calendarId: { eq: id } }, LINE_SELECTION);
  const lines =
    stored.length > 0
      ? stored
      : STANDARD_WORKING_LINES.map(({ values }) => ({
          name: String(values.name),
          dayofweek: String(values.dayofweek),
          hourFrom: Number(values.hourFrom),
          hourTo: Number(values.hourTo),
          dayPeriod: String(values.dayPeriod),
          weekType: null,
          sequence: Number(values.sequence),
        }));

  return calendar === undefined ? null : { id, tz: calendar.tz ?? 'UTC', twoWeeksCalendar: calendar.twoWeeksCalendar === true, lines };
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<CalendarRecord>>) => {
  const { operation, events } = readEvents<CalendarRecord>(payload);
  const errors = errorCollector();

  if (operation === 'created') {
    for (const event of events) {
      await errors.run(event.recordId, async () => {
        const [calendar] = await resourceCalendars.find<{ id: string; tz: string | null; seedKey: string | null; twoWeeksCalendar: boolean | null }>(
          { id: { eq: event.recordId } },
          'id tz seedKey twoWeeksCalendar',
        );

        if (calendar === undefined) {
          return;
        }
        const lineCount = (await resourceCalendarAttendances.find<{ id: string }>({ calendarId: { eq: calendar.id } }, 'id')).length;
        const plan = planCalendarCreate({
          calendar: { id: calendar.id, tz: calendar.tz, seedKey: calendar.seedKey, lineCount },
          standard: calendar.seedKey === null ? await readStandard() : null,
          defaultTimeZone: await defaultTimeZone({ actingMemberId: event.workspaceMemberId }),
        });

        if (plan.kind === 'refuse') {
          // A new record that is refused is removed; no record is left to hold a note, so the run's error says why.
          await resourceCalendars.destroyMany([calendar.id]);
          throw new Error(`The new working hours were removed. ${await localizedReason(event, plan.reason)}`);
        }
        const changed = Object.fromEntries(
          Object.entries(plan.data).filter(([field, value]) => (field === 'tz' ? calendar.tz !== value : (calendar.twoWeeksCalendar === true) !== value)),
        );

        if (Object.keys(changed).length > 0) {
          await resourceCalendars.update(calendar.id, changed);
        }
        if (plan.lines.length > 0) {
          await resourceCalendarAttendances.createMany(plan.lines);
        }
        await recomputeHoursPerDay([calendar.id]);
      });
    }
  }

  if (operation === 'updated') {
    for (const event of events) {
      const after = eventAfter(event);
      const before = eventBefore(event);

      if (after === undefined || before === undefined || !isStaffChange(operation, event, after)) {
        continue;
      }
      if (eventChangedFields(event, ['tz']).length > 0 && (after.tz === null || after.tz === '' || !isKnownTimeZone(after.tz))) {
        await errors.run(event.recordId, async () =>
          putBack({
            objectSingular: resourceCalendars.objectSingular,
            objectPlural: resourceCalendars.objectPlural,
            recordId: event.recordId,
            data: { tz: before.tz },
            reason: await localizedReason(event, RESOURCE_MESSAGES.timeZoneRefusal),
          }),
        );
      }
    }
    const flagChanged = events.filter((event) => eventChangedFields(event, ['twoWeeksCalendar']).length > 0).map((event) => event.recordId);

    if (flagChanged.length > 0) {
      await errors.run('hours per day', () => recomputeHoursPerDay(flagChanged));
    }
  }

  if (operation === 'deleted') {
    await errors.run('delete rules', () =>
      applyDeleteRules(
        resourceCalendars,
        CALENDAR_DELETE_RULES,
        events.map((event) => event.recordId),
      ),
    );
  }
  if (operation === 'restored') {
    await errors.run('working times', () =>
      restoreCascaded({ parents: restoredParents(events), children: [{ of: resourceCalendarAttendances, field: 'calendarId' }] }),
    );
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.calendar,
  name: 'platform-resource-calendar',
  description:
    'Gives new working hours a time zone and the standard working times, refuses an unknown time zone, keeps the average hours per day right, and deletes and restores the working times of a calendar with it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'resourceCalendar.*', batchMode: true },
});
