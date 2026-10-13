import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewWarehouse } from 'src/stock/utils/types/overview-warehouse.type';

// The view ids are this workspace's ids of the saved lists the links open:
// one per count, and one per kind of operation type for the type names.
// `today` is the UTC day the counts cut "late" at.
export type OverviewAnswer = {
  today: string;
  countViewIds: Partial<Record<OverviewCount, string>>;
  typeViewIds: Partial<Record<PickingTypeCode, string>>;
  warehouses: OverviewWarehouse[];
};
