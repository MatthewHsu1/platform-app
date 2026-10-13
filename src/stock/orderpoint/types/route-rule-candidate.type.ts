import { type RuleAction } from 'src/stock/types/rule-action.type';

export type RouteRuleCandidate = {
  routeId: string;
  routeSequence: number;
  routeCreatedAt: string;
  routeActive: boolean;
  productSelectable: boolean;
  productCategSelectable: boolean;
  locationDestId: string;
  action: RuleAction;
};
