import { describe, expect, it } from 'vitest';

import { leadDays } from 'src/stock/utils/procurement/lead-days.util';

describe('leadDays', () => {
  const rules = [
    { name: 'WH: Vendors → Stock', action: 'PULL' as const, delay: 2 },
    { name: 'WH: Input → Stock', action: 'PUSH' as const, delay: 3 },
    { name: 'WH: Stock → Output', action: 'PULL_PUSH' as const, delay: 1 },
    { name: 'WH: Output → Customers', action: 'PULL' as const, delay: 0 },
  ];

  it('adds the delays of pull rules only, then the horizon', () => {
    const result = leadDays(rules, 365);

    expect(result.totalDelay).toBe(3);
    expect(result.horizonTime).toBe(365);
    expect(result.descriptions).toEqual([
      { label: { message: 'Delay on {rule}', values: { rule: 'WH: Vendors → Stock' } }, value: { message: '+ {days} day(s)', values: { days: 2 } } },
      { label: { message: 'Delay on {rule}', values: { rule: 'WH: Stock → Output' } }, value: { message: '+ {days} day(s)', values: { days: 1 } } },
      { label: { message: 'Time Horizon' }, value: { message: '+ {days} day(s)', values: { days: 365 } } },
    ]);
  });

  it('leaves the horizon out when the caller bypasses it', () => {
    expect(leadDays(rules, null)).toMatchObject({ totalDelay: 3, horizonTime: 0 });
  });

  it('counts a negative delay like any other', () => {
    const result = leadDays(
      [
        { name: 'WH: Vendors → Stock', action: 'PULL' as const, delay: 3 },
        { name: 'WH: Stock → Output', action: 'PULL' as const, delay: -2 },
      ],
      null,
    );

    expect(result.totalDelay).toBe(1);
    expect(result.descriptions[1]).toEqual({
      label: { message: 'Delay on {rule}', values: { rule: 'WH: Stock → Output' } },
      value: { message: '+ {days} day(s)', values: { days: -2 } },
    });
  });
});
