import { EMPTY_QUALITY_VALUE, SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringFactor } from 'src/crm/scoring/types/scoring-factor.type';
import { floatRound } from 'src/shared/utils/float-round.util';

const QUALITY_VARIABLES: string[] = [SCORING_VARIABLE.phoneState, SCORING_VARIABLE.emailState];

// Shown when the counts give no score, so the panel still explains itself.
const SAMPLE_FACTORS: ScoringFactor[] = [
  { variable: SCORING_VARIABLE.emailState, value: EMPTY_QUALITY_VALUE, score: 0.1 },
  { variable: SCORING_VARIABLE.tag, value: 'Exploration', score: 0.2 },
  { variable: SCORING_VARIABLE.stage, value: 'New', score: 0.3 },
  { variable: SCORING_VARIABLE.phoneState, value: 'CORRECT', score: 0.7 },
  { variable: SCORING_VARIABLE.country, value: 'Belgium', score: 0.8 },
  { variable: SCORING_VARIABLE.tag, value: 'Consulting', score: 0.9 },
];

// Scores are compared with one half at two decimals.
const versusHalf = (score: number) => Math.sign(floatRound(score, 0.01) - 0.5);

// With few closed leads a missing phone can look like a good sign; such
// results are left out rather than shown.
const makesSense = ({ variable, value, score }: ScoringFactor) => {
  if (!QUALITY_VARIABLES.includes(variable)) {
    return true;
  }
  if ((value === EMPTY_QUALITY_VALUE || value === 'INCORRECT') && versusHalf(score) > 0) {
    return false;
  }

  return !(value === 'CORRECT' && versusHalf(score) < 0);
};

// Ties go by code point, so the order does not depend on the server's locale.
const byText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const byScore = (left: ScoringFactor, right: ScoringFactor) =>
  left.score - right.score || byText(left.variable, right.variable) || byText(left.value, right.value);

// The three values that raise the chance most and the three that lower it
// most. With no score the sample values are shown instead.
export const planTooltip = ({ probability, factors }: { probability: number | null; factors: ScoringFactor[] }) => {
  const value = probability ?? 0;
  const usesSample = floatRound(value, 0.01) === 0;
  const sorted = usesSample ? SAMPLE_FACTORS : [...factors].filter(makesSense).sort(byScore);

  return {
    probability: value,
    usesSample,
    top: [...sorted].reverse().slice(0, 3).filter((entry) => versusHalf(entry.score) > 0),
    low: sorted.slice(0, 3).filter((entry) => versusHalf(entry.score) < 0),
  };
};
