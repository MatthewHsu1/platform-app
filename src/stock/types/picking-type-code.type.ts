import { type PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';

export type PickingTypeCode = (typeof PICKING_TYPE_CODE)[keyof typeof PICKING_TYPE_CODE];
