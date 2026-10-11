import { type PlannedLotLine } from 'src/stock/utils/types/planned-lot-line.type';

export type PlanLotLinesResult =
  | { kind: 'refuse'; reason: string }
  | { kind: 'lines'; lines: PlannedLotLine[]; sequenceNumberNext: number | null };
