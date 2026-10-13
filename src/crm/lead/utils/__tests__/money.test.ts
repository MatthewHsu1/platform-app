import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { planMoney } from 'src/crm/lead/utils/money.util';

const usd = (amount: number) => ({ amountMicros: amount * 1_000_000, currencyCode: 'USD' });

describe('planMoney', () => {
  it('prorates the expected revenue by the probability, rounded to cents', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x', expectedRevenue: usd(1000), probability: 33.33 });

    expect(planMoney(lead, null).proratedRevenue).toEqual(usd(333.3));
  });

  it('spreads recurring revenue over the plan months and prorates it', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x', recurringRevenue: usd(1200), probability: 50 });

    expect(planMoney(lead, 12)).toMatchObject({
      recurringRevenueMonthly: usd(100),
      recurringRevenueMonthlyProrated: usd(50),
      recurringRevenueProrated: usd(600),
    });
  });

  it('counts a plan of zero months, or no plan, as one month', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x', recurringRevenue: usd(1200), probability: 0 });

    expect(planMoney(lead, 0).recurringRevenueMonthly).toEqual(usd(1200));
    expect(planMoney(lead, null).recurringRevenueMonthly).toEqual(usd(1200));
  });

  it('counts empty amounts and an empty probability as zero, in the default currency', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x' });

    expect(planMoney(lead, null).proratedRevenue).toEqual({ amountMicros: 0, currencyCode: 'USD' });
  });
});
