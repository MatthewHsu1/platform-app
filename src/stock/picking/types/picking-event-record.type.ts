import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

export type PickingEventRecord = PickingRow & ActorRow;
