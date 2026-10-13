import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';

// One group of a count: how many transfers of one operation type it holds.
export type OverviewCountGroup = { count: OverviewCount; pickingTypeId: string | null; total: number };
