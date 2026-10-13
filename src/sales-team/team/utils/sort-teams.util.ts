import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

// Lowest sequence first; among equal sequences the newest team first.
export const sortTeams = (teams: TeamRow[]): TeamRow[] =>
  [...teams].sort(
    (left, right) =>
      left.sequence - right.sequence || right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
  );
