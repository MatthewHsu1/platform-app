import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// Stages for all teams, or for the lead's team, by sequence then creation
// (not by name: the lookup follows the order stages were made in).
export const findStage = ({
  stages,
  teamId,
  onlyWon = false,
  foldFilter,
  limit,
}: {
  stages: StageRow[];
  teamId: string | null;
  onlyWon?: boolean;
  foldFilter: boolean;
  limit: 'first' | 'all';
}): StageRow[] => {
  const found = stages
    .filter((stage) => stage.teamIds.length === 0 || (teamId !== null && stage.teamIds.includes(teamId)))
    .filter((stage) => !onlyWon || stage.isWon)
    .filter((stage) => !foldFilter || !stage.fold)
    .sort(
      (left, right) =>
        left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );

  return limit === 'first' ? found.slice(0, 1) : found;
};
