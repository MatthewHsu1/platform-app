import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

export type MoveEventRecord = MoveRow & ActorRow;
