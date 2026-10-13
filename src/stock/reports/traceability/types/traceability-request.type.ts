import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';

// Either the report of a record, or one line unfolded one step upstream.
export type TraceabilityRequest =
  | { kind: 'report'; model: TraceabilityModel; recordId: string }
  | { kind: 'unfold'; lineId: string };
