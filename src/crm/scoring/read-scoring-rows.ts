import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { SCORING_ROW_SELECTION } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';

// Every row of these variables, all teams and no team, as the app.
export const readScoringRows = (variables: string[]) =>
  CRM_LEAD_SCORING_FREQUENCIES.find<ScoringRow>({ variable: { in: [...new Set(variables)] } }, SCORING_ROW_SELECTION);
