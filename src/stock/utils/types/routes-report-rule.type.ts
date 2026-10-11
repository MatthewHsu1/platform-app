import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';

export type RoutesReportRule = {
  id: string;
  name: string;
  routeId: string;
  action: RuleAction;
  procureMethod: RuleProcureMethod;
  locationSrcId: string | null;
  locationDestId: string | null;
  pickingTypeDefaultDestId: string | null;
  pickingTypeName: string | null;
  warehouseId: string | null;
};
