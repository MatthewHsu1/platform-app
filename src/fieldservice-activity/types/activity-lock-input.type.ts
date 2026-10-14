import { type ActivityLockFields } from 'src/fieldservice-activity/types/activity-lock-fields.type';

// What the lock decision reads: the activity before the saves, as it is stored now, the fields the saves wrote and
// whether a person made any of them.
export type ActivityLockInput = { before: ActivityLockFields; current: ActivityLockFields; written: string[]; staffSave: boolean };
