import { type MOVE_STATE } from 'src/stock/stock-options.constant';

export type MoveState = (typeof MOVE_STATE)[keyof typeof MOVE_STATE];
