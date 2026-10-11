import { type Priority } from 'src/stock/types/priority.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';
import { type MoveRef } from 'src/stock/utils/procurement/types/move-ref.type';
import { type PartnerRef } from 'src/stock/utils/procurement/types/partner-ref.type';

// A move being confirmed, as the procurement step reads it.
export type ConfirmingMove = {
  ref: MoveRef;
  productId: string;
  productUomId: string;
  productUomQty: number;
  locationId: string;
  locationDestId: string | null;
  date: string;
  dateDeadline: string | null;
  priority: Priority;
  procureMethod: ProcureMethod;
  ruleId: string | null;
  ruleName: string | null;
  ruleProcureMethod: RuleProcureMethod | null;
  ruleRouteSupplierWhId: string | null;
  hasOrigins: boolean;
  warehouseId: string | null;
  pickingTypeId: string | null;
  routeIds: string[];
  resultPackageTypeRouteIds: string[];
  referenceIds: string[];
  origin: string | null;
  pickingName: string | null;
  orderpointId: string | null;
  packagingUomId: string | null;
  partner: PartnerRef | null;
};
