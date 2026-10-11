import { type ActorRow } from 'src/stock/types/actor-row.type';

export type UomEventRecord = ActorRow & { id: string; relativeFactor: number; relativeUomId: string | null };
