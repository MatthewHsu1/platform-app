import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { SCORING_ROW_SELECTION } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';

// Every row of these variables, all teams and no team, as the app.
export const readScoringRows = (variables: string[]) =>
  CRM_LEAD_SCORING_FREQUENCIES.find<ScoringRow>({ variable: { in: [...new Set(variables)] } }, SCORING_ROW_SELECTION);

// The rows of these (variable, value) pairs only, all teams and no team: a
// count update touches no other row.
export const readScoringRowsOf = (pairs: { variable: string; value: string }[]) =>
  CRM_LEAD_SCORING_FREQUENCIES.find<ScoringRow>(
    { and: [{ variable: { in: [...new Set(pairs.map((pair) => pair.variable))] } }, { value: { in: [...new Set(pairs.map((pair) => pair.value))] } }] },
    SCORING_ROW_SELECTION,
  );
