import { type RoutesReportCell } from 'src/stock/utils/types/routes-report-cell.type';
import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';

export type RoutesReportRow = {
  routeId: string;
  routeName: string;
  colorIndex: number;
  ruleId: string;
  ruleName: string;
  action: RuleAction;
  procureMethod: RuleProcureMethod;
  pickingTypeName: string | null;
  cells: RoutesReportCell[];
};
