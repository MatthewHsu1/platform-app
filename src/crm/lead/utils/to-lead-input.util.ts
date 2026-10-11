import { type CurrencyValue } from 'src/crm/lead/types/currency-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { sameValue } from 'src/shared/utils/same-value.util';

const NOT_WRITABLE = new Set<keyof LeadRow>(['id', 'createdAt', 'deletedAt', 'createdBy', 'updatedBy']);

const MONEY_FIELDS = new Set<keyof LeadRow>([
  'expectedRevenue',
  'recurringRevenue',
  'proratedRevenue',
  'recurringRevenueMonthly',
  'recurringRevenueMonthlyProrated',
  'recurringRevenueProrated',
]);

export const changedLeadValues = (current: LeadRow, planned: Partial<LeadRow>): Partial<LeadRow> =>
  Object.fromEntries(
    Object.entries(planned).filter(([field, value]) => !sameValue(current[field as keyof LeadRow], value)),
  ) as Partial<LeadRow>;

// Twenty keeps money in whole micros.
export const toLeadInput = (values: Partial<LeadRow>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([field]) => !NOT_WRITABLE.has(field as keyof LeadRow))
      .map(([field, value]) => {
        if (MONEY_FIELDS.has(field as keyof LeadRow) && value !== null && typeof value === 'object') {
          const amount = value as CurrencyValue;

          return [
            field,
            { amountMicros: amount.amountMicros === null ? null : Math.round(amount.amountMicros), currencyCode: amount.currencyCode },
          ];
        }

        return [field, value];
      }),
  );
