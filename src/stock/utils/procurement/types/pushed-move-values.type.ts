import { type Priority } from 'src/stock/types/priority.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

// The move a manual push rule makes after a done move.
export type PushedMoveValues = {
  productId: string;
  productUomId: string;
  productUomQty: number;
  origin: string;
  locationId: string;
  locationDestId: string;
  locationFinalId: string | null;
  ruleId: string;
  date: string;
  dateDeadline: string | null;
  pickingTypeId: string;
  propagateCancel: boolean;
  warehouseId: string | null;
  procureMethod: ProcureMethod;
  companyId: string | null;
  personId: string | null;
  priority: Priority;
  restrictPartnerId: string | null;
  descriptionPickingManual: string | null;
  sequence: number | null;
  packagingUomId: string;
  referenceIds: string[];
  routeIds: string[];
};
