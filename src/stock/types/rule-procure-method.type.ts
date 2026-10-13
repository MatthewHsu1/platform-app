import { type RULE_PROCURE_METHOD } from 'src/stock/routing-options.constant';

export type RuleProcureMethod = (typeof RULE_PROCURE_METHOD)[keyof typeof RULE_PROCURE_METHOD];
