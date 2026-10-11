import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';

// A saved filter that cannot be used is put back. Filled with the filter
// translator.
export const checkAssignmentFilters = async (input: {
  objectSingular: 'crmTeam' | 'crmTeamMember';
  changes: AssignmentFilterChange[];
}): Promise<void> => {
  void input;
};
