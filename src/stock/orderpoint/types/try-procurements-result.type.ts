import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// `errors` are the batch's own; `failures` name each procurement that cannot run alone, by its index in the batch.
export type TryProcurementsResult =
  | { kind: 'done'; moveIds: string[] }
  | { kind: 'failed'; errors: TranslatableText[]; failures: { index: number; errors: TranslatableText[] }[] };
