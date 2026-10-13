import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type ScrapRow } from 'src/stock/types/scrap-row.type';

export type ScrapEventRecord = ScrapRow & ActorRow;
