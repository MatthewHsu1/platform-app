import { type RecordOperation } from 'src/shared/triggers/batch-events';

type ActorRecord = { updatedBy?: { source?: string | null } | null };

// Rows the app writes carry the APPLICATION actor. A put-back or a rule
// that applies only to staff actions skips them.
export const isApplicationWrite = (record: ActorRecord | undefined) =>
  record?.updatedBy?.source === 'APPLICATION';

// A delete does not touch updatedBy, so the row still names whoever saved it
// last. The event itself says who deleted it: a signed-in user, or nobody
// (the app's own token).
export const isStaffDelete = (event: { userId?: string; workspaceMemberId?: string }) =>
  event.userId !== undefined || event.workspaceMemberId !== undefined;

// A create or update names its saver in updatedBy; a delete or restore only
// on the event.
export const isStaffChange = (
  operation: RecordOperation,
  event: { userId?: string; workspaceMemberId?: string },
  after: ActorRecord | undefined,
) =>
  operation === 'deleted' || operation === 'restored'
    ? isStaffDelete(event)
    : !isApplicationWrite(after);
