// A case as triggers, planners and routes read it. The service level fields are read by the
// service level module only.
export type CaseRow = {
  id: string;
  createdAt: string;
  deletedAt: string | null;
  number: string | null;
  name: string | null;
  description: { markdown: string | null; blocknote: string | null } | null;
  assignedUserId: string | null;
  stageId: string | null;
  personId: string | null;
  companyId: string | null;
  partnerName: string | null;
  partnerEmail: { primaryEmail: string | null; additionalEmails: string[] | null } | null;
  teamId: string | null;
  categoryId: string | null;
  channel: string | null;
  priority: string | null;
  kanbanState: string | null;
  duplicateId: string | null;
  lastStageUpdate: string | null;
  assignedDate: string | null;
  closedDate: string | null;
  unattended: boolean | null;
  active: boolean | null;
  ticketTypeId?: string | null;
  productId?: string | null;
  slaDeadline?: string | null;
  slaStateExpired?: boolean | null;
  updatedBy: { source: string | null; workspaceMemberId: string | null } | null;
};
