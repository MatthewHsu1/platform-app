import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type FrequencyWrites } from 'src/crm/scoring/types/frequency-writes.type';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { stagesReached } from 'src/crm/scoring/utils/plan-scoring-deltas.util';
import { scoringPairs } from 'src/crm/scoring/utils/scoring-pairs.util';
import { floatRound } from 'src/shared/utils/float-round.util';

// The rows rebuilt from every closed lead, each count plus the 0.1 seed. A
// lead's state is read from its probability: 100 is won, 0 is lost; a closed
// lead at any other probability still makes its rows.
export const planRebuildRows = (closedLeads: LeadRow[], stages: StageRow[], fields: readonly PlsFieldKey[]): FrequencyWrites['creates'] => {
  const rows = new Map<string, FrequencyWrites['creates'][number]>();
  const add = (teamId: string | null, variable: string, value: string, won: number, lost: number) => {
    const key = JSON.stringify([teamId, variable, value]);
    const current = rows.get(key) ?? { teamId, variable, value, wonCount: 0, lostCount: 0 };

    current.wonCount += won;
    current.lostCount += lost;
    rows.set(key, current);
  };

  for (const lead of closedLeads) {
    const won = lead.probability === 100 ? 1 : 0;
    const lost = lead.probability === 0 ? 1 : 0;

    for (const [variable, value] of scoringPairs(lead, fields)) {
      if (variable !== SCORING_VARIABLE.stage) {
        add(lead.teamId, variable, value, won, lost);
        continue;
      }
      for (const stageId of stagesReached(value, won === 1, stages)) {
        add(lead.teamId, variable, stageId, won, lost);
      }
    }
  }

  return [...rows.values()].map((row) => ({
    ...row,
    wonCount: floatRound(row.wonCount + 0.1, 0.1),
    lostCount: floatRound(row.lostCount + 0.1, 0.1),
  }));
};
