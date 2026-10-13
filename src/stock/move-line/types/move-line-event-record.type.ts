import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

export type MoveLineEventRecord = MoveLineRow & { updatedAt?: string | null; updatedBy?: { source?: string | null } | null };
