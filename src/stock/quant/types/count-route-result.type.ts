import { type CountQuantView } from 'src/stock/quant/types/count-quant-view.type';

export type CountRouteResult =
  | { kind: 'done' }
  | { kind: 'needsAnswer'; question: 'conflict' | 'alreadySet'; quants: CountQuantView[] };
