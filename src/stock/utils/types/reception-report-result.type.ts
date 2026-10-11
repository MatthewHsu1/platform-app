import { type ReceptionSource } from 'src/stock/utils/types/reception-source.type';

export type ReceptionReportResult =
  | { kind: 'refused'; reason: string }
  | { kind: 'lines'; docIds: string[]; sources: ReceptionSource[] };
