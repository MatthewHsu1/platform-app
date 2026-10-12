export type AssignmentFilterChange = {
  recordId: string;
  operation: 'created' | 'updated';
  field: 'assignmentDomain' | 'assignmentDomainPreferred';
  before: string | null;
  after: string | null;
  staffChange: boolean;
  workspaceMemberId: string | undefined;
};
