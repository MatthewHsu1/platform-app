// The values of an activity the lock reads: the three a person may edit while it is to do, and the state.
export type ActivityLockFields = { name: string | null; required: boolean | null; ref: string | null; state: string | null };
