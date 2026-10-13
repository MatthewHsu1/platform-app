import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';

// A saved filter that must still run as a lead search.
export type FilterCheck = {
  recordId: string;
  operation: AssignmentFilterChange['operation'];
  field: AssignmentFilterChange['field'];
  before: string | null;
  after: string;
  workspaceMemberId: string | undefined;
};
