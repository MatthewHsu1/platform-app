import { type OrderpointValues } from 'src/stock/orderpoint/types/orderpoint-values.type';

// What a reordering rule holds now: a value the app never wrote is null.
export type StoredOrderpointValues = { [TKey in keyof OrderpointValues]: OrderpointValues[TKey] | null };
