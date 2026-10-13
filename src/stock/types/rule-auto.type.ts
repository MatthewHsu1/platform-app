import { type RULE_AUTO } from 'src/stock/routing-options.constant';

export type RuleAuto = (typeof RULE_AUTO)[keyof typeof RULE_AUTO];
