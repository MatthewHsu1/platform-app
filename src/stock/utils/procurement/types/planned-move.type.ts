import { type Priority } from 'src/stock/types/priority.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type MoveRef } from 'src/stock/utils/procurement/types/move-ref.type';

export type PlannedMove = {
  key: string;
  productId: string;
  productUomId: string;
  productUomQty: number;
  date: string;
  dateDeadline: string | null;
  locationId: string;
  locationFinalId: string;
  // The rule's destination when the rule gives it; null leaves it to the operation type.
  locationDestId: string | null;
  ruleId: string;
  pickingTypeId: string;
  warehouseId: string | null;
  propagateCancel: boolean;
  procureMethod: ProcureMethod;
  companyId: string | null;
  personId: string | null;
  moveDests: MoveRef[];
  referenceIds: string[];
  routeIds: string[];
  priority: Priority;
  orderpointId: string | null;
  origin: string | null;
  toRefund: boolean;
  procurementRun: string;
};
