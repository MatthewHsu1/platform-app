import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleAuto } from 'src/stock/types/rule-auto.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';

export type RoutingRule = {
  id: string;
  name: string;
  action: RuleAction;
  sequence: number;
  routeId: string;
  routeSequence: number;
  locationSrcId: string | null;
  locationDestId: string;
  locationDestFromRule: boolean;
  procureMethod: RuleProcureMethod;
  pickingTypeId: string;
  delay: number;
  partnerAddressId: string | null;
  partnerAddressPersonId: string | null;
  propagateCancel: boolean;
  warehouseId: string | null;
  auto: RuleAuto;
  pushDomain: unknown;
  createdAt: string;
};
