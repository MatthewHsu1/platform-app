import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { type ActivityLockInput } from 'src/fieldservice-activity/types/activity-lock-input.type';

const LOCKED_FIELDS = ['name', 'required', 'ref'] as const;

// Once an activity is completed or cancelled, a person cannot change its name, required flag or reference. The save
// is already stored, so the values it changed go back: only those that differ from before, and only for a person's
// save (the buttons' own writes never touch these fields). Null: nothing to put back.
export const planActivityLock = ({ before, current, written, staffSave }: ActivityLockInput): Record<string, unknown> | null => {
  if (!staffSave || before.state === ACTIVITY_STATE.TODO) {
    return null;
  }
  const putBack = Object.fromEntries(LOCKED_FIELDS.filter((field) => written.includes(field) && current[field] !== before[field]).map((field) => [field, before[field]]));

  return Object.keys(putBack).length === 0 ? null : putBack;
};
