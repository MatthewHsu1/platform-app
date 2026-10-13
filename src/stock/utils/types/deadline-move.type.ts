import { type MoveState } from 'src/stock/types/move-state.type';

export type DeadlineMove = { id: string; state: MoveState; dateDeadline: string | null; neighbourIds: string[] };
