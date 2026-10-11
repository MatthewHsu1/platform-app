import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type OverviewCounts } from 'src/stock/utils/types/overview-counts.type';

export type OverviewTypeCard = { id: string; name: string; code: PickingTypeCode; counts: OverviewCounts };
