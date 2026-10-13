export type RoundingMethod = 'UP' | 'HALF-UP' | 'DOWN';

// Round value / step, then multiply back. One float ulp
// nudges the quotient so 0.15 / 0.01 = 14.999… still rounds up to 15, not 16.
export const floatRound = (value: number, step: number, method: RoundingMethod = 'HALF-UP') => {
  if (value === 0) {
    return 0;
  }

  const normalized = value / step;
  const sign = Math.sign(normalized);
  const epsilon = 2 ** (Math.log2(Math.abs(normalized)) - 52);
  const magnitude =
    method === 'UP'
      ? Math.ceil(Math.abs(normalized) - epsilon)
      : method === 'DOWN'
        ? Math.floor(Math.abs(normalized) + epsilon)
        : Math.round(Math.abs(normalized) + epsilon);

  return Number((sign * magnitude * step).toPrecision(15));
};
