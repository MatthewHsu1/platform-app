import { type CurrencyValue } from 'src/crm/lead/types/currency-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { floatRound } from 'src/shared/utils/float-round.util';

const MICROS = 1_000_000;
const CENT = 0.01;

const amountOf = (money: CurrencyValue | null) => (money?.amountMicros ?? 0) / MICROS;

// Money is kept to the cent, the precision of the currency.
const toMoney = (amount: number, currencyCode: string | null): CurrencyValue => ({
  amountMicros: Math.round(floatRound(amount, CENT) * MICROS),
  currencyCode: currencyCode ?? DEFAULT_CURRENCY_CODE,
});

// The prorated revenue takes the expected revenue's currency; the three
// recurring results take the recurring revenue's.
export const planMoney = (lead: LeadRow, planMonths: number | null) => {
  const probability = lead.probability ?? 0;
  const expected = amountOf(lead.expectedRevenue);
  const recurring = amountOf(lead.recurringRevenue);
  const monthly = recurring / (planMonths === null || planMonths === 0 ? 1 : planMonths);
  const recurringCurrency = lead.recurringRevenue?.currencyCode ?? null;

  return {
    proratedRevenue: toMoney((expected * probability) / 100, lead.expectedRevenue?.currencyCode ?? null),
    recurringRevenueMonthly: toMoney(monthly, recurringCurrency),
    recurringRevenueMonthlyProrated: toMoney((monthly * probability) / 100, recurringCurrency),
    recurringRevenueProrated: toMoney((recurring * probability) / 100, recurringCurrency),
  };
};
