import { describe, expect, it } from 'vitest';

import { planTooltip } from 'src/crm/scoring/utils/plan-tooltip.util';

const factor = (variable: string, value: string, score: number) => ({ variable, value, score });

describe('planTooltip', () => {
  it('lists the three strongest values on each side', () => {
    const plan = planTooltip({
      probability: 74.3,
      factors: [
        factor('stage', 'qualified', 0.645),
        factor('country', 'c0', 0.353),
        factor('state', 's0', 0.92),
        factor('emailState', 'CORRECT', 0.5),
        factor('phoneState', 'CORRECT', 0.735),
        factor('source', 'src0', 0.08),
      ],
    });

    expect(plan.usesSample).toBe(false);
    expect(plan.top.map((entry) => entry.variable)).toEqual(['state', 'phoneState', 'stage']);
    expect(plan.low.map((entry) => entry.variable)).toEqual(['source', 'country']);
  });

  it('hides a missing or incorrect quality that scores high, and a correct one that scores low', () => {
    const missing = planTooltip({
      probability: 80,
      factors: [factor('stage', 'qualified', 0.645), factor('phoneState', 'False', 0.968), factor('emailState', 'INCORRECT', 0.968)],
    });
    const correctLow = planTooltip({
      probability: 80,
      factors: [factor('stage', 'qualified', 0.645), factor('phoneState', 'INCORRECT', 0.968), factor('emailState', 'CORRECT', 0.045)],
    });

    expect(missing.top.map((entry) => entry.variable)).toEqual(['stage']);
    expect(missing.low).toEqual([]);
    expect(correctLow.top.map((entry) => entry.variable)).toEqual(['stage']);
    expect(correctLow.low).toEqual([]);
  });

  it('breaks a tie of scores by variable and then value, in code point order', () => {
    const plan = planTooltip({
      probability: 30,
      factors: [factor('tag', 'b', 0.1), factor('tag', 'B', 0.1), factor('source', 'z', 0.1)],
    });

    expect(plan.low.map((entry) => `${entry.variable}:${entry.value}`)).toEqual(['source:z', 'tag:B', 'tag:b']);
  });

  it('treats a score that rounds to one half as neither side', () => {
    const plan = planTooltip({ probability: 50, factors: [factor('country', 'c0', 0.503), factor('source', 's', 0.496)] });

    expect(plan.top).toEqual([]);
    expect(plan.low).toEqual([]);
  });

  it('shows the sample factors when there is no score', () => {
    for (const probability of [0, null]) {
      const plan = planTooltip({ probability, factors: [] });

      expect(plan.probability).toBe(0);
      expect(plan.usesSample).toBe(true);
      expect(plan.top).toEqual([
        { variable: 'tag', value: 'Consulting', score: 0.9 },
        { variable: 'country', value: 'Belgium', score: 0.8 },
        { variable: 'phoneState', value: 'CORRECT', score: 0.7 },
      ]);
      expect(plan.low).toEqual([
        { variable: 'emailState', value: 'False', score: 0.1 },
        { variable: 'tag', value: 'Exploration', score: 0.2 },
        { variable: 'stage', value: 'New', score: 0.3 },
      ]);
    }
  });
});
