import { type SelectFieldOption } from 'src/shared/fields';

// What code reads of an activity: still to do, done or cancelled. Only "to do" can be completed or cancelled, and
// only a required activity that is still to do stops its order from completing.
export const ACTIVITY_STATE = { TODO: 'TODO', DONE: 'DONE', CANCEL: 'CANCEL' } as const;

export const ACTIVITY_STATE_OPTIONS: SelectFieldOption[] = [
  { value: ACTIVITY_STATE.TODO, label: 'To do', color: 'blue' },
  { value: ACTIVITY_STATE.DONE, label: 'Completed', color: 'green' },
  { value: ACTIVITY_STATE.CANCEL, label: 'Cancelled', color: 'gray' },
];
