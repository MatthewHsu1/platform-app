import { type TraceRecordLink } from 'src/stock/utils/types/trace-record-link.type';

export type TraceRow = {
  lineId: string;
  reference: string;
  referenceRecord: TraceRecordLink | null;
  productName: string;
  date: string;
  lotId: string | null;
  lotName: string;
  from: string;
  fromRecord: TraceRecordLink | null;
  to: string;
  toRecord: TraceRecordLink | null;
  quantity: string;
  usage: 'in' | 'out' | 'internal';
  unfoldable: boolean;
  pickingId: string | null;
};
