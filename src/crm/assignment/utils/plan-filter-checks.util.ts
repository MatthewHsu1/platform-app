import { type FilterCheck } from 'src/crm/assignment/types/filter-check.type';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';

const asText = (value: string | null) => (value !== null && value.trim() !== '' ? value : null);

// A filter a person saved must run as a lead search; an empty filter always
// does. The app's own put-back is not checked again.
export const planFilterChecks = (changes: AssignmentFilterChange[]): FilterCheck[] =>
  changes.flatMap((change) => {
    const after = asText(change.after);
    const before = asText(change.before);

    if (!change.staffChange || after === null || after === before) {
      return [];
    }
    return [
      { recordId: change.recordId, operation: change.operation, field: change.field, before, after, workspaceMemberId: change.workspaceMemberId },
    ];
  });
