import { type RULE_ACTION } from 'src/stock/routing-options.constant';

export type RuleAction = (typeof RULE_ACTION)[keyof typeof RULE_ACTION];
