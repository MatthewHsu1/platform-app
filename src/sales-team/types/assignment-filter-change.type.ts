export type AssignmentFilterChange = {
  recordId: string;
  field: 'assignmentDomain' | 'assignmentDomainPreferred';
  before: string | null;
  after: string | null;
  staffChange: boolean;
  workspaceMemberId: string | undefined;
};
