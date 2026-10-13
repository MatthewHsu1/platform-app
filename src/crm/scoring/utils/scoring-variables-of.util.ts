import { SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';

// The variables the score reads for these chosen fields: the stage always,
// and every tag under one variable.
export const scoringVariablesOf = (fields: readonly PlsFieldKey[]) => [
  SCORING_VARIABLE.stage,
  ...fields.map((key) => (key === 'tags' ? SCORING_VARIABLE.tag : SCORING_VARIABLE[key])),
];
