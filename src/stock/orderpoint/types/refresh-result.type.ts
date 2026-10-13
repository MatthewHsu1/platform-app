import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

export type RefreshResult =
  | { kind: 'done'; created: number }
  // `continuing`: the holder goes on from an earlier run, so the list is filling.
  | { kind: 'held'; continuing: boolean }
  | { kind: 'refused'; error: TranslatableText; productId: string }
  | { kind: 'continued'; created: number; remainingLocationIds: string[] };
