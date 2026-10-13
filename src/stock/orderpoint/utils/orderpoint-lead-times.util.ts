import { type LeadDaysRule } from 'src/stock/orderpoint/types/lead-days-rule.type';
import { type OrderpointLeadTimes } from 'src/stock/orderpoint/types/orderpoint-lead-times.type';
import { leadDays } from 'src/stock/utils/procurement/lead-days.util';
import { addDays } from 'src/stock/utils/stock-dates.util';

export const orderpointLeadTimes = ({
  today,
  rules,
  horizonDays,
}: {
  today: string;
  rules: LeadDaysRule[];
  horizonDays: number;
}): OrderpointLeadTimes => {
  const delays = leadDays(rules, horizonDays);

  return {
    leadDays: delays.totalDelay,
    horizonTime: delays.horizonTime,
    leadHorizonDate: addDays(today, delays.totalDelay + delays.horizonTime),
  };
};
