import { type ScheduleInput } from 'src/fieldservice/types/schedule-input.type';
import { type SchedulePlan } from 'src/fieldservice/types/schedule-plan.type';

const MILLISECONDS_PER_HOUR = 3_600_000;

// Written datetimes are stored without seconds.
const zeroSeconds = (iso: string): string => {
  const time = new Date(iso);
  time.setUTCSeconds(0, 0);
  return time.toISOString();
};

const isWritten = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

// A written start and end give the duration, a lone end pulls the start back
// from the written duration (or the stored one), a lone start pushes the end
// forward the same way, and clearing the start clears the end. A written
// start that only differs from stored by seconds moves nothing, and a
// duration-only change plans the duration while leaving the end alone. Only
// fields that differ from the stored row are returned, so an empty plan means
// no write.
export const planSchedule = (stored: ScheduleInput, written: Partial<ScheduleInput>): SchedulePlan => {
  const plan: SchedulePlan = {};

  const start = written.scheduledStart;
  const end = written.scheduledEnd;
  const duration = written.scheduledDurationHours;

  const hasStart = isWritten(start);
  const hasEnd = isWritten(end);
  const hasDuration = duration !== undefined && duration !== 0;

  if (hasStart && hasEnd) {
    const zeroedStart = zeroSeconds(start);
    const zeroedEnd = zeroSeconds(end);
    const durationHours = (Date.parse(zeroedEnd) - Date.parse(zeroedStart)) / MILLISECONDS_PER_HOUR;

    if (zeroedStart !== stored.scheduledStart) {
      plan.scheduledStart = zeroedStart;
    }
    if (zeroedEnd !== stored.scheduledEnd) {
      plan.scheduledEnd = zeroedEnd;
    }
    if (durationHours !== stored.scheduledDurationHours) {
      plan.scheduledDurationHours = durationHours;
    }
    return plan;
  }

  if (hasEnd && !hasStart) {
    const zeroedEnd = zeroSeconds(end);
    const durationHours = hasDuration && duration !== undefined ? duration : stored.scheduledDurationHours;
    const computedStart = new Date(Date.parse(zeroedEnd) - durationHours * MILLISECONDS_PER_HOUR).toISOString();

    if (computedStart !== stored.scheduledStart) {
      plan.scheduledStart = computedStart;
    }
    if (zeroedEnd !== stored.scheduledEnd) {
      plan.scheduledEnd = zeroedEnd;
    }
    if (duration !== undefined && duration !== stored.scheduledDurationHours) {
      plan.scheduledDurationHours = duration;
    }
    return plan;
  }

  if (hasStart) {
    const zeroedStart = zeroSeconds(start);
    const startMoved = zeroedStart !== stored.scheduledStart;
    const durationHours = hasDuration && duration !== undefined ? duration : stored.scheduledDurationHours;
    const computedEnd = new Date(Date.parse(zeroedStart) + durationHours * MILLISECONDS_PER_HOUR).toISOString();

    if (startMoved) {
      plan.scheduledStart = zeroedStart;
    }
    if (startMoved && computedEnd !== stored.scheduledEnd) {
      plan.scheduledEnd = computedEnd;
    }
    if (duration !== undefined && duration !== stored.scheduledDurationHours) {
      plan.scheduledDurationHours = duration;
    }
    return plan;
  }

  if (!hasStart && !hasEnd && start !== undefined) {
    if (stored.scheduledEnd !== null) {
      plan.scheduledEnd = null;
    }
    if (start !== stored.scheduledStart) {
      plan.scheduledStart = null;
    }
    if (duration !== undefined && duration !== stored.scheduledDurationHours) {
      plan.scheduledDurationHours = duration;
    }
    return plan;
  }

  if (!hasStart && !hasEnd && duration !== undefined && duration !== stored.scheduledDurationHours) {
    plan.scheduledDurationHours = duration;
    return plan;
  }

  return plan;
};
