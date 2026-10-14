// Caller order is sequence order (lowest first), so the first team is the fallback.
export const chooseTeam = (
  locationTeamId: string | null,
  teamsBySequence: Array<{ id: string }>,
): string => {
  if (locationTeamId !== null) {
    return locationTeamId;
  }
  const firstTeam = teamsBySequence[0];
  if (firstTeam === undefined) {
    throw new Error('no service team');
  }
  return firstTeam.id;
};
