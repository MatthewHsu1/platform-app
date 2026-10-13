import { type Priority } from 'src/stock/types/priority.type';
import { type MoveRef } from 'src/stock/utils/procurement/types/move-ref.type';
import { type PartnerRef } from 'src/stock/utils/procurement/types/partner-ref.type';

// `warehouseId` undefined: not given, so the warehouses of the location chain count.
export type ProcurementValues = {
  routeIds?: string[];
  warehouseId?: string | null;
  packagingUomId?: string | null;
  priority?: Priority;
  datePlanned?: string;
  dateDeadline?: string | null;
  moveDests?: MoveRef[];
  referenceIds?: string[];
  orderpointId?: string | null;
  partner?: PartnerRef | null;
};
