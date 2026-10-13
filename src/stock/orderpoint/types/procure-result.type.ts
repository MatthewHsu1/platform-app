import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// `unprocessedIds`: rules left unordered because their batch failed while no single rule of it failed alone.
export type ProcureResult =
  | { kind: 'done'; moveIds: string[]; failures: OrderpointFailure[]; unprocessedIds: string[] }
  | { kind: 'refused'; errors: TranslatableText[] };
