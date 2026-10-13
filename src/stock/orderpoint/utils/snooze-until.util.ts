import { type SnoozePeriod } from 'src/stock/orderpoint/types/snooze-period.type';
import { addMonths } from 'src/stock/orderpoint/utils/day.util';
import { addDays } from 'src/stock/utils/stock-dates.util';

export const snoozeUntil = (period: SnoozePeriod, today: string): string | null => {
  switch (period) {
    case 'DAY':
      return addDays(today, 1);
    case 'WEEK':
      return addDays(today, 7);
    case 'MONTH':
      return addMonths(today, 1);
    case 'CUSTOM':
      return null;
  }
};
