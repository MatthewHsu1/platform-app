import { type WarehouseLocationField } from 'src/stock/utils/types/warehouse-location-field.type';
import { type WarehouseTypeField } from 'src/stock/utils/types/warehouse-type-field.type';

export type NewRowRole = WarehouseLocationField | WarehouseTypeField | `${WarehouseTypeField}Sequence`;
