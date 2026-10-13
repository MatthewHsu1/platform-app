import { NO_NUMBER } from 'src/helpdesk/helpdesk-options.constant';
import { type CaseContext } from 'src/helpdesk/types/case-context.type';
import { type CaseCreatePlan } from 'src/helpdesk/types/case-create-plan.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { applicableStages } from 'src/helpdesk/utils/applicable-stages.util';
import { firstTeamOfMember, isTeamMember } from 'src/helpdesk/utils/team-membership.util';

export const planCaseCreate = ({
  after,
  creatorMemberId,
  context,
  now,
}: {
  after: CaseRow;
  creatorMemberId: string | null;
  context: CaseContext;
  now: string;
}): CaseCreatePlan => {
  let assignedUserId = after.assignedUserId;

  // A staff member who creates a case without an assignee takes it, unless
  // the case is for a team they are not in.
  if (assignedUserId === null && context.settings.autoAssign && creatorMemberId !== null) {
    if (after.teamId === null || isTeamMember(after.teamId, creatorMemberId, context.memberships)) {
      assignedUserId = creatorMemberId;
    }
  }

  const teamId =
    after.teamId ?? (assignedUserId === null ? null : firstTeamOfMember(assignedUserId, context.teams, context.memberships));
  const stageId = after.stageId ?? applicableStages(context.stages, teamId)[0]?.id ?? null;
  const stage = context.stages.find((row) => row.id === stageId);
  const companyId = after.personId === null ? null : (context.personCompanies.get(after.personId) ?? null);

  const planned: Partial<CaseRow> = {
    assignedUserId,
    teamId,
    stageId,
    assignedDate: assignedUserId !== null && after.assignedDate === null ? now : after.assignedDate,
    lastStageUpdate: after.lastStageUpdate ?? now,
    unattended: stage?.unattended ?? false,
    companyId,
  };

  const data = Object.fromEntries(
    Object.entries(planned).filter(([field, value]) => after[field as keyof CaseRow] !== value),
  ) as Partial<CaseRow>;

  return { data, needsNumber: after.number === null || after.number === '' || after.number === NO_NUMBER };
};
