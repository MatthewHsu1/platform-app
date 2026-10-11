import { type RecordOperation } from 'src/shared/triggers/batch-events';

// Rules brought back from the trash or the archive: their numbers are from
// before they left.
export const revivedOrderpointIds = (
  operation: RecordOperation,
  changes: { recordId: string; before?: { active?: boolean | null }; after?: { active?: boolean | null } }[],
) => {
  if (operation === 'restored') {
    return changes.map((change) => change.recordId);
  }
  if (operation !== 'updated') {
    return [];
  }
  return changes.filter((change) => change.before?.active === false && change.after?.active === true).map((change) => change.recordId);
};
