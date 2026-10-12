import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringDelta } from 'src/crm/scoring/types/scoring-delta.type';
import { isCreatedOnOrAfter, isScoringStartDate, scoringPairs } from 'src/crm/scoring/utils/scoring-pairs.util';

type Group = { pick: (moves: StatusMoves) => boolean; state: 'won' | 'lost'; step: 1 | -1 };

// The order matters when one save both leaves one state and reaches another:
// each group is applied on the rows the groups before it left.
const GROUPS: Group[] = [
  { pick: (moves) => moves.won === 1, state: 'won', step: 1 },
  { pick: (moves) => moves.won === -1, state: 'won', step: -1 },
  { pick: (moves) => moves.lost === 1, state: 'lost', step: 1 },
  { pick: (moves) => moves.lost === -1, state: 'lost', step: -1 },
];

// A won lead counts in every stage; a lost lead in its stage and the earlier
// ones, so the first stage always holds every closed lead.
export const stagesReached = (stageId: string, won: boolean, stages: StageRow[]) => {
  if (won) {
    return stages.map((stage) => stage.id);
  }
  const current = stages.find((stage) => stage.id === stageId);

  return current === undefined ? [] : stages.filter((stage) => stage.sequence <= current.sequence).map((stage) => stage.id);
};

// The count changes of the given status moves, summed per row inside each
// group, in the order the groups must be applied.
export const planScoringDeltas = ({
  moves,
  stages,
  fields,
  startDate,
}: {
  moves: { lead: LeadRow; moves: StatusMoves }[];
  stages: StageRow[];
  fields: readonly PlsFieldKey[];
  startDate: string | null;
}): ScoringDelta[] => {
  if (!isScoringStartDate(startDate)) {
    return [];
  }
  const counted = moves.filter(({ lead }) => isCreatedOnOrAfter(lead.createdAt, startDate));
  const deltas: ScoringDelta[] = [];

  for (const group of GROUPS) {
    const sums = new Map<string, ScoringDelta>();
    const add = (teamId: string | null, variable: string, value: string) => {
      const key = JSON.stringify([teamId, variable, value]);
      const delta = sums.get(key) ?? { teamId, variable, value, won: 0, lost: 0 };

      if (group.state === 'won') {
        delta.won += group.step;
      } else {
        delta.lost += group.step;
      }
      sums.set(key, delta);
    };

    for (const { lead } of counted.filter((entry) => group.pick(entry.moves))) {
      for (const [variable, value] of scoringPairs(lead, fields)) {
        if (variable === SCORING_VARIABLE.stage) {
          for (const stageId of stagesReached(value, group.state === 'won', stages)) {
            add(lead.teamId, variable, stageId);
          }
        } else {
          add(lead.teamId, variable, value);
        }
      }
    }
    deltas.push(...sums.values());
  }

  return deltas;
};
