import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';

export type SupplierWarehouse = Pick<
  RoutingWarehouse,
  'id' | 'name' | 'code' | 'deliverySteps' | 'lotStockId' | 'whOutputStockLocId' | 'outTypeId' | 'pickTypeId'
>;
