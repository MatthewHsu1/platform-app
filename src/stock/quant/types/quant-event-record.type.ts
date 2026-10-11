import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export type QuantEventRecord = QuantRow & ActorRow;
