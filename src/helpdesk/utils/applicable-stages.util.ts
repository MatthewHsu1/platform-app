import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';

export const sortCaseStages = (stages: CaseStageRow[]) =>
  [...stages].sort(
    (left, right) =>
      left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );

// Stages a case of this team may sit in: those meant for every team, plus the
// team's own. Archived stages are never chosen.
export const applicableStages = (stages: CaseStageRow[], teamId: string | null) =>
  sortCaseStages(
    stages.filter(
      (row) => row.active && (row.teamIds.length === 0 || (teamId !== null && row.teamIds.includes(teamId))),
    ),
  );
