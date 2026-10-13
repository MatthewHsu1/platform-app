import { type MoveState } from 'src/stock/types/move-state.type';

export type SplitMove = { id: string; state: MoveState; productUomQty: number; quantity: number | null };
