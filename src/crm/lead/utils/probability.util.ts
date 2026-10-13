import { floatRound } from 'src/shared/utils/float-round.util';

const HUNDREDTH = 0.01;

// Equal once each is rounded to two decimals, an empty probability counting as 0.
export const sameProbability = (left: number | null, right: number | null) =>
  floatRound(left ?? 0, HUNDREDTH) === floatRound(right ?? 0, HUNDREDTH);
