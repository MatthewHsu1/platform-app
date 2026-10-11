import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewWarehouse } from 'src/stock/utils/types/overview-warehouse.type';

// `viewIds` are this workspace's ids of the saved lists the counts open.
export type OverviewAnswer = { viewIds: Partial<Record<OverviewCount, string>>; warehouses: OverviewWarehouse[] };
