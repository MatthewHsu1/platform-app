import { type LeadDays } from 'src/stock/utils/procurement/types/lead-days.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

export const DELAY_ON_RULE_MESSAGE = 'Delay on {rule}';
export const TIME_HORIZON_MESSAGE = 'Time Horizon';
export const LEAD_DAYS_VALUE_MESSAGE = '+ {days} day(s)';

// Lead time of a chain of rules: the delays of its pull rules, plus the
// replenishment horizon unless the caller leaves it out (null). The texts are
// translated by the screen that shows them.
export const leadDays = (rules: Pick<RoutingRule, 'name' | 'action' | 'delay'>[], horizonDays: number | null): LeadDays => {
  const delaying = rules.filter((rule) => (rule.action === 'PULL' || rule.action === 'PULL_PUSH') && rule.delay !== 0);
  const descriptions: LeadDays['descriptions'] = delaying.map((rule) => ({
    label: { message: DELAY_ON_RULE_MESSAGE, values: { rule: rule.name } },
    value: { message: LEAD_DAYS_VALUE_MESSAGE, values: { days: rule.delay } },
  }));
  const horizonTime = horizonDays ?? 0;

  if (horizonTime !== 0) {
    descriptions.push({
      label: { message: TIME_HORIZON_MESSAGE },
      value: { message: LEAD_DAYS_VALUE_MESSAGE, values: { days: horizonTime } },
    });
  }

  return { totalDelay: delaying.reduce((sum, rule) => sum + rule.delay, 0), horizonTime, descriptions };
};
