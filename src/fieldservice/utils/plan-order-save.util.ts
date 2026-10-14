import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { ORDER_PRIORITY } from 'src/fieldservice/fieldservice-options.constant';
import { type OrderSaveContext } from 'src/fieldservice/types/order-save-context.type';
import { type OrderSavePlan } from 'src/fieldservice/types/order-save-plan.type';
import { type OrderState } from 'src/fieldservice/types/order-state.type';
import { type RequestPriority } from 'src/fieldservice/types/request-priority.type';
import { type ScheduleInput } from 'src/fieldservice/types/schedule-input.type';
import { actualDuration } from 'src/fieldservice/utils/actual-duration.util';
import { chooseTeam } from 'src/fieldservice/utils/choose-team.util';
import { closedStatusOf } from 'src/fieldservice/utils/closed-status-of.util';
import { computeRequestLate } from 'src/fieldservice/utils/compute-request-late.util';
import { findHoliday } from 'src/fieldservice/utils/find-holiday.util';
import { planSchedule } from 'src/fieldservice/utils/plan-schedule.util';
import { planStageGuard } from 'src/fieldservice/utils/plan-stage-guard.util';
import { sameValue } from 'src/shared/utils/same-value.util';

const REQUEST_PRIORITY: Record<string, RequestPriority> = {
  [ORDER_PRIORITY.NORMAL]: 'normal',
  [ORDER_PRIORITY.LOW]: 'low',
  [ORDER_PRIORITY.HIGH]: 'high',
  [ORDER_PRIORITY.URGENT]: 'urgent',
};

const hasText = (value: string | null) => value !== null && value.trim() !== '';

const withoutSeconds = (iso: string) => {
  const time = new Date(iso);
  time.setUTCSeconds(0, 0);
  return time.toISOString();
};

// The schedule fields a save wrote, in the planner's terms. A create writes what it fills.
const writtenSchedule = (after: OrderState, written: ReadonlySet<string>, isCreate: boolean): Partial<ScheduleInput> => {
  const schedule: Partial<ScheduleInput> = {};

  if (isCreate ? after.scheduledDateStart !== null : written.has('scheduledDateStart')) {
    schedule.scheduledStart = after.scheduledDateStart;
  }
  if (isCreate ? after.scheduledDateEnd !== null : written.has('scheduledDateEnd')) {
    schedule.scheduledEnd = after.scheduledDateEnd;
  }
  if (isCreate ? after.scheduledDuration !== 0 : written.has('scheduledDuration')) {
    schedule.scheduledDurationHours = after.scheduledDuration;
  }
  return schedule;
};

const pick = (row: OrderState, fields: ReadonlySet<string>): Partial<OrderState> =>
  Object.fromEntries(Object.entries(row).filter(([field]) => fields.has(field) && field !== 'id')) as Partial<OrderState>;

// One save of a service order. A staff save (and every create) gets the save rules: a manual move to Completed
// is refused, the schedule is completed from what was written, a start on a holiday is refused, a new location
// brings its team and directions, a new template its instructions, and a new order its request window. Every
// save gets the values computed from the row: closed status, actual duration and the location's service area.
export const planOrderSave = ({
  before,
  after,
  written,
  staffSave,
  context,
}: {
  before: OrderState | null;
  after: OrderState;
  written: ReadonlySet<string>;
  staffSave: boolean;
  context: OrderSaveContext;
}): OrderSavePlan => {
  const isCreate = before === null;
  const next: OrderState = { ...after };
  const data: Partial<OrderState> = {};
  const set = <TField extends keyof OrderState>(field: TField, value: OrderState[TField]) => {
    if (!sameValue(next[field], value)) {
      next[field] = value;
      data[field] = value;
    }
  };
  const refuse = (reason: string, values: Record<string, string> = {}): OrderSavePlan => ({
    kind: 'refuse',
    reason,
    values,
    putBack: before === null ? {} : pick(before, written),
  });

  // A new order starts open, so one made straight into Completed (a card added to the Completed column of the
  // board) is a manual move too.
  if (staffSave && (before === null || written.has('stage'))) {
    const guard = planStageGuard(
      before === null ? 'OPEN' : closedStatusOf(before.stage),
      closedStatusOf(after.stage),
      false,
    );

    if (guard.putBackTo !== null) {
      return refuse(FIELDSERVICE_MESSAGES.manualComplete);
    }
  }

  if (isCreate || staffSave) {
    const stored: ScheduleInput =
      before === null
        ? { scheduledStart: null, scheduledEnd: null, scheduledDurationHours: 0 }
        : { scheduledStart: before.scheduledDateStart, scheduledEnd: before.scheduledDateEnd, scheduledDurationHours: before.scheduledDuration };
    const schedule = planSchedule(stored, writtenSchedule(after, written, isCreate));

    if (schedule.scheduledStart !== undefined) {
      set('scheduledDateStart', schedule.scheduledStart);
    }
    if (schedule.scheduledEnd !== undefined) {
      set('scheduledDateEnd', schedule.scheduledEnd);
    }
    if (schedule.scheduledDurationHours !== undefined) {
      set('scheduledDuration', schedule.scheduledDurationHours);
    }

    const startSaved = isCreate || written.has('scheduledDateStart') || schedule.scheduledStart !== undefined;
    const holiday = startSaved ? findHoliday(next.scheduledDateStart, next.scheduledDateEnd, context.holidays) : null;

    if (holiday !== null && next.scheduledDateStart !== null) {
      return refuse(FIELDSERVICE_MESSAGES.holiday, { date: next.scheduledDateStart.slice(0, 10), name: holiday.name ?? '' });
    }

    const locationSaved = isCreate || written.has('locationId');

    if (isCreate ? next.teamId === null : locationSaved && !written.has('teamId')) {
      try {
        set('teamId', chooseTeam(context.location?.teamId ?? null, context.teamsBySequence));
      } catch {
        return refuse(FIELDSERVICE_MESSAGES.noTeam);
      }
    }
    if (isCreate ? next.locationDirections === null && next.locationId !== null : locationSaved && !written.has('locationDirections')) {
      set('locationDirections', context.location?.completeDirection ?? null);
    }
    if (next.templateId !== null && (isCreate ? !hasText(next.todo) : written.has('templateId') && !written.has('todo'))) {
      set('todo', context.templateInstructions);
    }
    if (isCreate) {
      if (next.requestEarly === null) {
        set('requestEarly', withoutSeconds(context.now));
      }
      if (next.requestLate === null && next.requestEarly !== null) {
        set(
          'requestLate',
          computeRequestLate(next.requestEarly, REQUEST_PRIORITY[next.priority ?? ORDER_PRIORITY.NORMAL] ?? 'normal', context.hoursByPriority),
        );
      }
    }
  }

  set('closedStatus', closedStatusOf(next.stage));
  set('duration', actualDuration(next.dateStart, next.dateEnd));
  set('territoryId', context.location?.territoryId ?? null);
  set('branchId', context.location?.branchId ?? null);
  set('districtId', context.location?.districtId ?? null);
  set('regionId', context.location?.regionId ?? null);

  return { kind: 'write', data };
};
