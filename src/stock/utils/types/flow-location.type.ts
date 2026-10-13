import { type LocationRow } from 'src/stock/types/location-row.type';

export type FlowLocation = Pick<LocationRow, 'id' | 'name' | 'active'>;
