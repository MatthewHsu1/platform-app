import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { readScoringGeneration } from 'src/crm/scoring/scoring-generation';
import { SCORING_ROW_SELECTION } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { withScoringGeneration } from 'src/crm/scoring/utils/scoring-generation-filter.util';

// The rows of the current set of counts that match, all teams and no team, as the app.
export const findScoringRows = async (filter: Record<string, unknown>) =>
  CRM_LEAD_SCORING_FREQUENCIES.find<ScoringRow>(withScoringGeneration(filter, await readScoringGeneration()), SCORING_ROW_SELECTION);

// Every row of these variables.
export const readScoringRows = (variables: string[]) => findScoringRows({ variable: { in: [...new Set(variables)] } });

// The rows of these (variable, value) pairs only: a count update touches no other row.
export const readScoringRowsOf = (pairs: { variable: string; value: string }[]) =>
  findScoringRows({
    and: [{ variable: { in: [...new Set(pairs.map((pair) => pair.variable))] } }, { value: { in: [...new Set(pairs.map((pair) => pair.value))] } }],
  });
