import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

export type PickingTypeEventRecord = PickingTypeRow & ActorRow;
