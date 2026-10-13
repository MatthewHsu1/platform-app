import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type WarehouseLocationField } from 'src/stock/utils/types/warehouse-location-field.type';
import { type WarehouseTypeField } from 'src/stock/utils/types/warehouse-type-field.type';

export type FlowWarehouse = Pick<WarehouseRow, 'id' | 'name' | 'code' | 'active' | 'receptionSteps' | 'deliverySteps'> &
  Record<WarehouseLocationField | WarehouseTypeField, string | null>;
