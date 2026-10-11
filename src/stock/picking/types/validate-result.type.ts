import { type PrintLink } from 'src/stock/printing/types/print-link.type';

// showReceptionReport: receipts whose reception report opens after Validate (set only when there are some).
// showTransfers: the backorder question lists its transfers one by one.
export type ValidateResult =
  | { kind: 'done'; backorderIds: string[]; printouts: PrintLink[]; showReceptionReport?: string[] }
  | { kind: 'needsAnswer'; question: 'backorder' | 'expiredLots'; pickingIds: string[]; lotIds?: string[]; showTransfers?: boolean }
  | { kind: 'refused'; reason: string };
