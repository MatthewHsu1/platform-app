import { type MOVE_TYPE } from 'src/stock/stock-options.constant';

export type MoveType = (typeof MOVE_TYPE)[keyof typeof MOVE_TYPE];
