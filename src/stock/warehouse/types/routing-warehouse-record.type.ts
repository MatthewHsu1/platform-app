import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';

// A warehouse as stored: a field may still be empty while its row is not made yet.
export type RoutingWarehouseRecord = { id: string } & {
  [TKey in Exclude<keyof RoutingWarehouse, 'id'>]: RoutingWarehouse[TKey] | null;
};
