import { type OverviewTypeCard } from 'src/stock/utils/types/overview-type-card.type';

export type OverviewWarehouse = { warehouseId: string | null; warehouseName: string | null; types: OverviewTypeCard[] };
