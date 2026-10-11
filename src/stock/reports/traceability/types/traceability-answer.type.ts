import { type TraceRecordLink } from 'src/stock/utils/types/trace-record-link.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

type NamedLink = TraceRecordLink & { name: string };

// `deliveries` is set for a lot only: the deliveries it left in and their customers.
export type TraceabilityAnswer = {
  rows: TraceRow[];
  deliveries: { transfers: NamedLink[]; customers: NamedLink[] } | null;
};
