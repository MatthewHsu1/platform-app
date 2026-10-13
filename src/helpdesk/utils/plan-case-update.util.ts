import { CASE_RELATION_JOIN_COLUMNS } from 'src/helpdesk/helpdesk-options.constant';
import { type CaseContext } from 'src/helpdesk/types/case-context.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { type CaseUpdatePlan } from 'src/helpdesk/types/case-update-plan.type';
import { applicableStages } from 'src/helpdesk/utils/applicable-stages.util';
import { firstTeamOfMember, isTeamMember } from 'src/helpdesk/utils/team-membership.util';

export const writtenCaseFields = (updatedFields: string[]) =>
  new Set(updatedFields.map((field) => CASE_RELATION_JOIN_COLUMNS[field] ?? field));

export const planCaseUpdate = ({
  before,
  after,
  written,
  applySaveRules,
  context,
  now,
}: {
  before: CaseRow;
  after: CaseRow;
  written: ReadonlySet<string>;
  applySaveRules: boolean;
  context: CaseContext;
  now: string;
}): CaseUpdatePlan => {
  const data: Partial<CaseRow> = {};
  let { assignedUserId, teamId, stageId } = after;

  if (applySaveRules) {
    const wroteAssignee = written.has('assignedUser');
    const wroteTeam = written.has('team');
    const wroteStage = written.has('stage');

    if (wroteAssignee && assignedUserId !== null) {
      data.assignedDate = now;
    }
    // A field the save itself wrote is never replaced by a derived value.
    if (wroteAssignee && !wroteTeam && teamId === null && assignedUserId !== null) {
      teamId = firstTeamOfMember(assignedUserId, context.teams, context.memberships);
    }
    if (
      (wroteTeam || teamId !== after.teamId) &&
      !wroteAssignee &&
      teamId !== null &&
      assignedUserId !== null &&
      !isTeamMember(teamId, assignedUserId, context.memberships)
    ) {
      assignedUserId = null;
    }
    // A new assignee re-checks the stage even when the team stays, because
    // the team is worked out again from the assignee.
    if ((wroteTeam || wroteAssignee) && !wroteStage) {
      const stages = applicableStages(context.stages, teamId);
      if (!stages.some((row) => row.id === stageId)) {
        stageId = stages[0]?.id ?? null;
      }
    }
    if (wroteStage && after.stageId !== null) {
      data.lastStageUpdate = now;
      if (context.stages.find((row) => row.id === after.stageId)?.closed === true) {
        data.closedDate = now;
      }
    }
  }

  if (assignedUserId !== after.assignedUserId) {
    data.assignedUserId = assignedUserId;
  }
  if (teamId !== after.teamId) {
    data.teamId = teamId;
  }
  if (stageId !== after.stageId) {
    data.stageId = stageId;
  }

  const unattended = context.stages.find((row) => row.id === stageId)?.unattended ?? false;
  if (unattended !== (after.unattended ?? false)) {
    data.unattended = unattended;
  }

  if (after.personId !== before.personId) {
    const companyId = after.personId === null ? null : (context.personCompanies.get(after.personId) ?? null);
    if (companyId !== after.companyId) {
      data.companyId = companyId;
    }
  }

  return { data, stageSaved: applySaveRules && written.has('stage') };
};
