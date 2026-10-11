import { type CheckMove } from 'src/stock/utils/types/check-move.type';

export type CheckPicking = { id: string; name: string; moves: CheckMove[]; lineCount: number };
