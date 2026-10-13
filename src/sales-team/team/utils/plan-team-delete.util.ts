import { PROTECTED_TEAM_SEED_KEYS } from 'src/sales-team/sales-team-universal-identifiers.constant';

// A default team stays (it may be archived), and so does a team some stage
// is limited to; every other deleted team goes ahead.
export const planTeamDelete = ({
  deleted,
  linkedTeamIds,
}: {
  deleted: { id: string; seedKey: string | null }[];
  linkedTeamIds: ReadonlySet<string>;
}) => {
  const restore: { id: string; reason: 'DEFAULT_TEAM' | 'USED_BY_STAGE' }[] = [];
  const proceed: string[] = [];

  for (const team of deleted) {
    if (team.seedKey !== null && PROTECTED_TEAM_SEED_KEYS.includes(team.seedKey)) {
      restore.push({ id: team.id, reason: 'DEFAULT_TEAM' });
    } else if (linkedTeamIds.has(team.id)) {
      restore.push({ id: team.id, reason: 'USED_BY_STAGE' });
    } else {
      proceed.push(team.id);
    }
  }

  return { restore, proceed };
};
