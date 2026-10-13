import { type LOCATION_USAGE } from 'src/stock/stock-options.constant';

export type LocationUsage = (typeof LOCATION_USAGE)[keyof typeof LOCATION_USAGE];
