import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleAuto } from 'src/stock/types/rule-auto.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';

export type RuleRow = {
  id: string;
  name: string | null;
  active: boolean;
  action: RuleAction;
  routeId: string | null;
  locationSrcId: string | null;
  locationDestId: string | null;
  pickingTypeId: string | null;
  procureMethod: RuleProcureMethod;
  warehouseId: string | null;
  auto: RuleAuto;
  propagateCancel: boolean;
  propagateCarrier: boolean;
  locationDestFromRule: boolean;
};
