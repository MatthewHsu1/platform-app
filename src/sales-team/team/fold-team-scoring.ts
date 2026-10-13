import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { findScoringRows } from 'src/crm/scoring/read-scoring-rows';
import { planTeamFold } from 'src/crm/scoring/utils/plan-team-fold.util';

// Scoring rows of a deleted team are folded into the rows without a team
// before anything else of the team changes, then removed.
export const foldTeamScoring = async (teamIds: string[]): Promise<void> => {
  const teamRows = await findScoringRows({ teamId: { in: teamIds } });

  if (teamRows.length === 0) {
    return;
  }
  const noTeamRows = await findScoringRows({ teamId: { is: 'NULL' }, variable: { in: [...new Set(teamRows.map((row) => row.variable))] } });
  const fold = planTeamFold({ teamRows, noTeamRows });

  for (const update of fold.updates) {
    await CRM_LEAD_SCORING_FREQUENCIES.update(update.id, { wonCount: update.wonCount, lostCount: update.lostCount });
  }
  await CRM_LEAD_SCORING_FREQUENCIES.createMany(fold.creates);
  await CRM_LEAD_SCORING_FREQUENCIES.destroyMany(fold.destroyIds);
};
