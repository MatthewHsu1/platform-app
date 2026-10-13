import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { scoringPairs } from 'src/crm/scoring/utils/scoring-pairs.util';

// Stage rows are few and the team totals come from them; a tag row seen too
// rarely is left out of its variable's totals, which a sum cannot tell. Both
// are read whole.
const READ_WHOLE: readonly string[] = [SCORING_VARIABLE.stage, SCORING_VARIABLE.tag];

// The score of a lead needs the rows of its own values and, for each of its
// variables, the totals over every value. The rows are read for the values the
// leads have only; the totals of those variables are summed by the server.
export const planScoringRead = (leads: LeadRow[], fields: readonly PlsFieldKey[]) => {
  const pairs = leads.flatMap((lead) => scoringPairs(lead, fields));
  const variables = [...new Set(pairs.map(([variable]) => variable))];
  const whole = variables.filter((variable) => READ_WHOLE.includes(variable));
  const summed = variables.filter((variable) => !READ_WHOLE.includes(variable));
  const values = [...new Set(pairs.filter(([variable]) => summed.includes(variable)).map(([, value]) => value))];
  const parts = [
    ...(whole.length > 0 ? [{ variable: { in: whole } }] : []),
    ...(summed.length > 0 ? [{ and: [{ variable: { in: summed } }, { value: { in: values } }] }] : []),
  ];

  return { filter: parts.length === 0 ? null : parts.length === 1 ? parts[0] : { or: parts }, summedVariables: summed, usedVariables: variables };
};
