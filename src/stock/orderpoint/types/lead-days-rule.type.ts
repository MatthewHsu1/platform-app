import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

export type LeadDaysRule = Pick<RoutingRule, 'id' | 'name' | 'action' | 'delay'>;
