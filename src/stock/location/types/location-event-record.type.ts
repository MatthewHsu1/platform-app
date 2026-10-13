import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type LocationRow } from 'src/stock/types/location-row.type';

export type LocationEventRecord = LocationRow & ActorRow;
