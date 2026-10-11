import { type PICKING_STATE } from 'src/stock/stock-options.constant';

export type PickingState = (typeof PICKING_STATE)[keyof typeof PICKING_STATE];
