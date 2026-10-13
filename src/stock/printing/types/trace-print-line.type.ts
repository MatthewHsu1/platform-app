import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

// A traceability row as shown, with its depth in the unfolded tree (1 at the top).
export type TracePrintLine = { row: TraceRow; level: number };
